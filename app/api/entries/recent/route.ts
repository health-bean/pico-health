import { NextResponse } from "next/server";
import { sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { timelineEntries } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

// ── GET /api/entries/recent?days=7[&fallback=1] ─────────────────────
// Most-logged items with frequency counts. With fallback=1, a window with
// nothing in it (someone returning after a break) falls back to all-time
// favourites, so the list is never empty for a person with history.

async function query(userId: string, days: number | null) {
  const where =
    days === null
      ? sql`${timelineEntries.userId} = ${userId}`
      : sql`${timelineEntries.userId} = ${userId}
        AND ${timelineEntries.entryDate} >= CURRENT_DATE - ${days}::int`;
  return db
    .select({
      entryType: timelineEntries.entryType,
      name: timelineEntries.name,
      count: sql<number>`count(*)::int`,
      lastUsed: sql<string>`max(${timelineEntries.entryDate})`,
    })
    .from(timelineEntries)
    .where(where)
    .groupBy(timelineEntries.entryType, timelineEntries.name)
    .orderBy(desc(sql`count(*)`))
    .limit(50);
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseInt(searchParams.get("days") ?? "7", 10);
    const days = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 3650) : 7;
    const fallback = searchParams.get("fallback") === "1";

    let items = await query(session.userId, days);
    let window: "recent" | "all" = "recent";
    if (items.length === 0 && fallback) {
      items = await query(session.userId, null);
      window = "all";
    }

    return NextResponse.json({ items, window });
  } catch (error) {
    log.error("GET /api/entries/recent error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
