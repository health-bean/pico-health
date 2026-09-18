import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { log } from "@/lib/logger";

/**
 * Validate redirect path to prevent open redirects.
 * Only allows relative paths starting with / that don't contain protocol schemes.
 */
function sanitizeRedirectPath(path: string): string {
  const fallback = "/chat";
  if (!path || typeof path !== "string") return fallback;
  // Must start with exactly one / and not contain protocol-like patterns
  if (!/^\/[^/]/.test(path) && path !== "/") return fallback;
  // Block javascript:, data:, or any scheme
  if (/^[a-z]+:/i.test(path.replace(/^\/+/, ""))) return fallback;
  return path;
}

/**
 * Auth callback handler — exchanges an auth code for a session.
 * Used by Supabase OAuth (Google), email links, password reset, magic links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next") ?? "/chat");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Check if this user already has a profile
      const [existing] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, data.user.id))
        .limit(1);

      if (!existing) {
        // New user via OAuth — create their profile and send to onboarding
        const meta = data.user.user_metadata;
        const firstName =
          meta?.full_name?.split(" ")[0] ||
          meta?.name?.split(" ")[0] ||
          meta?.given_name ||
          "";

        try {
          await db.insert(profiles).values({
            id: data.user.id,
            email: data.user.email?.toLowerCase() ?? "",
            firstName,
          });
        } catch (err) {
          log.error("OAuth profile creation failed", { error: err as Error });
        }

        return NextResponse.redirect(`${origin}/onboarding`);
      }

      // Existing user — check if they still need onboarding
      const [profile] = await db
        .select({
          onboardingCompleted: profiles.onboardingCompleted,
          deletionRequestedAt: profiles.deletionRequestedAt,
        })
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

      if (profile && !profile.onboardingCompleted) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}${restored ? (next.includes("?") ? "&" : "?") + "restored=1" : ""}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
