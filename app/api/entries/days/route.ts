import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getSessionFromCookies } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { timelineEntries } from "@/lib/db/schema";

const MAX_RANGE_DAYS = 62;

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Entry counts per day for a date range: the data behind "which days did I
 * log" strips. Cheap on purpose (one grouped count, no joins).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }
  const { from, to } = parsed.data;
  const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (span < 0 || span > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: `Range must be 0–${MAX_RANGE_DAYS} days` }, { status: 400 });
  }

  const rows = await db
    .select({
      entryDate: timelineEntries.entryDate,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.userId, session.userId),
        gte(timelineEntries.entryDate, from),
        lte(timelineEntries.entryDate, to)
      )
    )
    .groupBy(timelineEntries.entryDate);

  const days: Record<string, number> = {};
  for (const row of rows) days[row.entryDate] = row.count;

  return NextResponse.json({ days });
}
