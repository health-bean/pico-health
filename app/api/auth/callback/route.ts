import { NextResponse } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";
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

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Auth callback handler. Accepts either:
 *  - `?code=` — PKCE code from OAuth (Google) or the default email templates;
 *    only works in the browser that started the flow (verifier cookie)
 *  - `?token_hash=&type=` — email confirmation / reset links built from
 *    `{{ .TokenHash }}`; works on any device
 * then makes sure the app profile exists (created here for new accounts,
 * i.e. only once the email is verified) and redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeRedirectPath(searchParams.get("next") ?? "/chat");

  let user: User | null = null;
  const supabase = await createClient();
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) user = data.user;
  } else if (tokenHash && otpType && EMAIL_OTP_TYPES.includes(otpType)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (!error) user = data.user;
  }

  if (user) {
    let created = false;
    try {
      created = await ensureProfile(user);
    } catch (err) {
      log.error("profile creation failed", { error: err as Error });
    }
    if (created) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    // Existing user — check if they still need onboarding
    const [profile] = await db
      .select({
        onboardingCompleted: profiles.onboardingCompleted,
        deletionRequestedAt: profiles.deletionRequestedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    // Coming back is how a pending deletion is undone.
    const restored = profile?.deletionRequestedAt != null;
    if (restored) {
      await db
        .update(profiles)
        .set({ deletionRequestedAt: null, updatedAt: new Date() })
        .where(eq(profiles.id, user.id));
      log.info("account restored on sign-in", { userId: user.id });
    }

    // A password-reset link must land on the reset form, even mid-onboarding.
    if (profile && !profile.onboardingCompleted && next !== "/reset-password") {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    return NextResponse.redirect(`${origin}${next}${restored ? (next.includes("?") ? "&" : "?") + "restored=1" : ""}`);
  }

  // If code exchange / verification fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
