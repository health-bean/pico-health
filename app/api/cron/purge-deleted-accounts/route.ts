import { NextResponse } from "next/server";
import { lte, isNotNull, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { GRACE_DAYS } from "@/lib/account/deletion";

/**
 * Purges accounts whose grace period has run out. Scheduled daily in
 * vercel.json; requires CRON_SECRET so nothing else can call it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - GRACE_DAYS);

    const due = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(isNotNull(profiles.deletionRequestedAt), lte(profiles.deletionRequestedAt, cutoff)));

    const admin = createAdminClient();
    let purged = 0;
    for (const row of due) {
      await db.delete(profiles).where(eq(profiles.id, row.id));
      const { error } = await admin.auth.admin.deleteUser(row.id);
      if (error) log.error("auth user delete failed during purge", { userId: row.id, error: new Error(error.message) });
      purged += 1;
    }

    if (purged > 0) log.info("purged accounts past their grace period", { purged });
    return NextResponse.json({ purged });
  } catch (error) {
    log.error("GET /api/cron/purge-deleted-accounts failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
