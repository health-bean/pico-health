import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, waitlistSignups } from "@/lib/db/schema";

/**
 * Sign-up is invite-only until launch. An email may create an account when
 * it's on the early-access list with invited_at set (Admin → Users → Invite).
 * Existing accounts are never affected. Set OPEN_SIGNUP=true to reopen.
 */
export function signupIsOpen(): boolean {
  return process.env.OPEN_SIGNUP === "true";
}

export async function isInvited(email: string | null | undefined): Promise<boolean> {
  if (signupIsOpen()) return true;
  if (!email) return false;
  const [row] = await db
    .select({ id: waitlistSignups.id })
    .from(waitlistSignups)
    .where(and(eq(waitlistSignups.email, email.trim().toLowerCase()), isNotNull(waitlistSignups.invitedAt)))
    .limit(1);
  return !!row;
}

export async function hasProfile(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  return !!row;
}

/** May this verified auth user get a Pico profile? Existing ones always may. */
export async function mayHaveProfile(user: { id: string; email?: string | null }): Promise<boolean> {
  return (await hasProfile(user.id)) || (await isInvited(user.email));
}

/** Where to send someone who isn't invited yet. */
export const INVITE_REQUIRED_PATH = "/?invite=required#early-access";
