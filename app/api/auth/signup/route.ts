import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, SIGNUP_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * One response for every accepted signup — new address, already registered,
 * or registered-but-unconfirmed — so this endpoint can't be used to find out
 * who has an account. A new address gets a confirmation email; the profile
 * row is created once the link is followed (see /api/auth/callback).
 */
const ACCEPTED = { ok: true, confirmationRequired: true } as const;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(`signup:${ip}`, SIGNUP_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const { origin } = new URL(request.url);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Must be in Supabase Auth → URL Configuration → Redirect URLs.
        emailRedirectTo: `${origin}/api/auth/callback?next=/onboarding`,
        data: { firstName },
      },
    });

    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return NextResponse.json(ACCEPTED);
      }
      if (error.code === "weak_password") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
        return NextResponse.json(
          { error: "Too many signup attempts. Please try again later." },
          { status: 429 }
        );
      }
      log.error("signup error", { error: error as Error });
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    if (data.session) {
      // Only happens if "Confirm email" is turned off in the Supabase dashboard.
      log.warn("signup returned a session: Supabase email confirmation appears to be disabled");
    }

    return NextResponse.json(ACCEPTED);
  } catch (error) {
    log.error("Signup error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
