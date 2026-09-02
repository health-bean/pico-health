import { and, eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { timelineEntries, foods, customFoods } from "@/lib/db/schema";

/**
 * Fields a user may edit on an existing timeline entry.
 * `notes` is stored inside `structuredContent.notes`.
 */
export interface EntryPatch {
  name?: string;
  notes?: string | null;
  severity?: number | null;
  entryDate?: string;
  entryTime?: string | null;
  mealType?: string | null;
  foodId?: string | null;
}

/**
 * Delete a timeline entry owned by `userId`.
 * Returns the deleted row, or null if no entry matched (not found / not owned).
 */
export async function deleteEntry(userId: string, entryId: string) {
  const [deleted] = await db
    .delete(timelineEntries)
    .where(and(eq(timelineEntries.id, entryId), eq(timelineEntries.userId, userId)))
    .returning();

  return deleted ?? null;
}

/**
 * Update a timeline entry owned by `userId` with a validated subset of fields.
 * Returns the updated row, or null if no entry matched (not found / not owned).
 */
export async function updateEntry(userId: string, entryId: string, patch: EntryPatch) {
  const values: PgUpdateSetSource<typeof timelineEntries> = { updatedAt: new Date() };

  if (patch.name !== undefined) values.name = patch.name;
  if (patch.severity !== undefined) values.severity = patch.severity;
  if (patch.entryDate !== undefined) values.entryDate = patch.entryDate;
  if (patch.entryTime !== undefined) values.entryTime = patch.entryTime;
  if (patch.mealType !== undefined) values.mealType = patch.mealType;
  if (patch.foodId !== undefined) values.foodId = patch.foodId;

  if (patch.notes !== undefined) {
    // Merge into the JSONB blob without clobbering other structured fields.
    values.structuredContent =
      patch.notes === null
        ? sql`COALESCE(${timelineEntries.structuredContent}, '{}'::jsonb) - 'notes'`
        : sql`COALESCE(${timelineEntries.structuredContent}, '{}'::jsonb) || ${JSON.stringify({ notes: patch.notes })}::jsonb`;
  }

  const [updated] = await db
    .update(timelineEntries)
    .set(values)
    .where(and(eq(timelineEntries.id, entryId), eq(timelineEntries.userId, userId)))
    .returning();

  return updated ?? null;
}

/**
 * Resolve a food the user may reference from an entry: a curated/USDA food,
 * or one of the user's own (non-archived) custom foods.
 * Returns { id, displayName } or null when not found / not owned.
 */
export async function getFoodForUser(
  userId: string,
  foodId: string
): Promise<{ id: string; displayName: string } | null> {
  const [curated] = await db
    .select({ id: foods.id, displayName: foods.displayName })
    .from(foods)
    .where(eq(foods.id, foodId))
    .limit(1);

  if (curated) return curated;

  const [custom] = await db
    .select({ id: customFoods.id, displayName: customFoods.displayName })
    .from(customFoods)
    .where(
      and(
        eq(customFoods.id, foodId),
        eq(customFoods.userId, userId),
        eq(customFoods.isArchived, false)
      )
    )
    .limit(1);

  return custom ?? null;
}
