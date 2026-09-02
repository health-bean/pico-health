import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { timelineEntries, profiles } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

// ── GET /api/entries/stats ──────────────────────────────────────────────
// Tracking progress for the capture loop's mandate strip:
// distinct days tracked (all time), first entry date, and tracking goal.

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [stats] = await db
      .select({
        daysTracked: sql<number>`COUNT(DISTINCT ${timelineEntries.entryDate})::int`,
        firstEntryDate: sql<string | null>`MIN(${timelineEntries.entryDate})`,
      })
      .from(timelineEntries)
      .where(eq(timelineEntries.userId, session.userId));

    const [profile] = await db
      .select({
        trackingGoalDays: profiles.trackingGoalDays,
        trackingGoalStartDate: profiles.trackingGoalStartDate,
      })
      .from(profiles)
      .where(eq(profiles.id, session.userId))
      .limit(1);

    return NextResponse.json({
      daysTracked: stats?.daysTracked ?? 0,
      firstEntryDate: stats?.firstEntryDate ?? null,
      trackingGoalDays: profile?.trackingGoalDays ?? null,
      trackingGoalStartDate: profile?.trackingGoalStartDate ?? null,
    });
  } catch (error) {
    log.error("GET /api/entries/stats failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
