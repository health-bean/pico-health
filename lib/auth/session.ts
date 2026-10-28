import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
  isAdmin: boolean;
  timezone: string;
}

const emptySession: SessionData = {
  userId: "",
  email: "",
  firstName: "",
  isAdmin: false,
  timezone: "America/New_York",
};

/**
 * Get the current authenticated user.
 *
 * Uses getClaims(), which verifies the access token's signature (locally
 * via the project's JWKS for asymmetric keys, or against the Auth server
 * for legacy HS256 keys) and its expiry. Never use getSession() here: it
 * returns whatever user object is in the cookie without verifying it, so a
 * forged cookie would be trusted. Middleware also calls getUser(), but it
 * only gates page routes and API 401s — this function must stand on its
 * own because every route handler relies on it.
 *
 * React cache() deduplicates within a single request.
 */
export const getSessionFromCookies = cache(
  async (): Promise<SessionData> => {
    const supabase = await createClient();

    let claims: Record<string, unknown> | null = null;
    try {
      const { data, error } = await supabase.auth.getClaims();
      if (!error && data?.claims) claims = data.claims as Record<string, unknown>;
    } catch {
      claims = null;
    }

    const userId = typeof claims?.sub === "string" ? claims.sub : "";
    if (!claims || !userId) return emptySession;

    const email = typeof claims.email === "string" ? claims.email : "";
    const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
    const metaFirstName = typeof metadata.firstName === "string" ? metadata.firstName : "";

    const [profile] = await db
      .select({
        firstName: profiles.firstName,
        isAdmin: profiles.isAdmin,
        timezone: profiles.timezone,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    return {
      userId,
      email,
      firstName: profile?.firstName ?? metaFirstName,
      isAdmin: profile?.isAdmin ?? false,
      timezone: profile?.timezone ?? "America/New_York",
    };
  }
);
