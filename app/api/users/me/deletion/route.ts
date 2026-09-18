import { NextResponse } from "next/server";
import { eq, isNotNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { GRACE_DAYS, purgeDateFrom } from "@/lib/account/deletion";

/**
 * POST   schedule deletion (data kept for the grace period, then purged)
 * DELETE ?now=1 delete permanently right away; otherwise cancel a pending request
 */

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const requestedAt = new Date();
    await db
      .update(profiles)
      .set({ deletionRequestedAt: requestedAt, updatedAt: new Date() })
      .where(eq(profiles.id, session.userId));

    // Sign out here: the account is on its way out, and signing back in is
    // exactly what restores it.
    const supabase = await createClient();
    await supabase.auth.signOut();

    log.info("account deletion scheduled", { userId: session.userId });
    return NextResponse.json({
      scheduled: true,
      graceDays: GRACE_DAYS,
      purgeAt: purgeDateFrom(requestedAt).toISOString(),
    });
  } catch (error) {
    log.error("POST /api/users/me/deletion failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const now = new URL(request.url).searchParams.get("now") === "1";

    if (!now) {
      // Cancel: only meaningful while a request is pending.
      await db
        .update(profiles)
        .set({ deletionRequestedAt: null, updatedAt: new Date() })
        .where(and(eq(profiles.id, session.userId), isNotNull(profiles.deletionRequestedAt)));
      log.info("account deletion cancelled", { userId: session.userId });
      return NextResponse.json({ restored: true });
    }

    // Permanent: every table that holds this person's data cascades from the
    // profile row, then the auth user goes too so the email is free again.
    await db.delete(profiles).where(eq(profiles.id, session.userId));

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(session.userId);
    if (error) {
      log.error("auth user delete failed after profile delete", {
        userId: session.userId,
        error: new Error(error.message),
      });
    }

    const supabase = await createClient();
    await supabase.auth.signOut();

    log.info("account deleted permanently", { userId: session.userId });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    log.error("DELETE /api/users/me/deletion failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
