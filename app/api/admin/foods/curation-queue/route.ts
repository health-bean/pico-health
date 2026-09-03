import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foods, foodTriggerProperties, timelineEntries } from "@/lib/db/schema";
import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

// GET /api/admin/foods/curation-queue
// Surfaces what needs curation attention:
//  - foods with no trigger-property row (sorted by how often they're logged)
//  - logged food names that never matched a food row
//  - counts of property rows still awaiting practitioner review
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Foods with no food_trigger_properties row, with log counts (all users, all time).
    const logCount = sql<number>`count(${timelineEntries.id})::int`;
    const missingProperties = await db
      .select({
        foodId: foods.id,
        displayName: foods.displayName,
        source: foods.source,
        logCount,
      })
      .from(foods)
      .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
      .leftJoin(timelineEntries, eq(timelineEntries.foodId, foods.id))
      .where(isNull(foodTriggerProperties.id))
      .groupBy(foods.id, foods.displayName, foods.source)
      .orderBy(desc(logCount), asc(foods.displayName));

    // Food entries that never matched a food row, grouped by lowercased name.
    const loweredName = sql<string>`lower(${timelineEntries.name})`;
    const nameCount = sql<number>`count(*)::int`;
    const unmatchedNames = await db
      .select({ name: loweredName, logCount: nameCount })
      .from(timelineEntries)
      .where(
        and(eq(timelineEntries.entryType, "food"), isNull(timelineEntries.foodId))
      )
      .groupBy(loweredName)
      .orderBy(desc(nameCount))
      .limit(50);

    // Property rows still awaiting practitioner review, by status.
    const statusRows = await db
      .select({
        status: foodTriggerProperties.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(foodTriggerProperties)
      .where(ne(foodTriggerProperties.reviewStatus, "practitioner_reviewed"))
      .groupBy(foodTriggerProperties.reviewStatus);

    const unreviewed: Record<string, number> = {
      founder_set: 0,
      ai_proposed: 0,
      unreviewed: 0,
    };
    for (const row of statusRows) {
      if (row.status in unreviewed) {
        unreviewed[row.status] = row.count;
      }
    }

    return NextResponse.json({ missingProperties, unmatchedNames, unreviewed });
  } catch (error) {
    log.error("GET /api/admin/foods/curation-queue error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
