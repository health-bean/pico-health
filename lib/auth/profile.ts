import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

function firstNameFrom(meta: Record<string, unknown> | null | undefined): string {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return (
    str(meta?.firstName) ||
    str(meta?.given_name) ||
    str(meta?.full_name).split(" ")[0] ||
    str(meta?.name).split(" ")[0] ||
    ""
  ).slice(0, 100);
}

/**
 * Create the app profile for a verified auth user if it doesn't exist yet.
 * Idempotent (ON CONFLICT DO NOTHING), so every sign-in path can call it:
 * the email-confirmation callback, OAuth, and password login (covers a
 * confirmation link opened on another device, where the callback could not
 * finish the session). Returns true when a profile was created.
 */
export async function ensureProfile(user: AuthUserLike): Promise<boolean> {
  const created = await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email?.toLowerCase() ?? "",
      firstName: firstNameFrom(user.user_metadata),
    })
    .onConflictDoNothing()
    .returning({ id: profiles.id });
  return created.length > 0;
}
