import { and, eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { timelineEntries } from "@/lib/db/schema";

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
