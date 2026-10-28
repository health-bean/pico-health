import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { ensureProfile } from "@/lib/auth/profile";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`login:${ip}`, AUTH_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error?.code === "email_not_confirmed") {
      // Only reachable with the right password, so this reveals nothing new.
      return NextResponse.json(
        { error: "Please confirm your email first — use the link we sent you." },
        { status: 403 }
      );
    }

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // A confirmation link opened on another device verifies the email but
    // can't finish the session, so the profile may not exist yet.
    const createdProfile = await ensureProfile(data.user);

    // Fetch profile for app-specific data
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, data.user.id))
      .limit(1);

    // Coming back is how a pending deletion is undone.
    const restored = profile?.deletionRequestedAt != null;
    if (restored) {
      await db
        .update(profiles)
        .set({ deletionRequestedAt: null, updatedAt: new Date() })
        .where(eq(profiles.id, data.user.id));
      log.info("account restored on sign-in", { userId: data.user.id });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: profile?.firstName ?? "",
        isAdmin: profile?.isAdmin ?? false,
      },
      restored,
      needsOnboarding: createdProfile,
    });
  } catch (error) {
    log.error("login failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
