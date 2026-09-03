import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clarifierResponses,
  foodCategories,
  foods,
  foodSubcategories,
  foodTriggerProperties,
  profiles,
  timelineEntries,
} from "@/lib/db/schema";
import type { ClarifierDimension, ClarifierHistory, PropertyAxis, PropertyLevel } from "@/lib/clarifiers/types";

/** A food entry with everything the clarifier engine needs. */
export interface ClarifierEntryRow {
  id: string;
  foodId: string | null;
  name: string;
  foodDisplayName: string | null;
  foodCategory: string | null;
  structuredContent: Record<string, unknown> | null;
  properties: Partial<Record<PropertyAxis, PropertyLevel | boolean>> | null;
}

/**
 * Food entries owned by `userId`, either by id list or by date, joined with
 * curated food name/category/properties. Custom foods come back with
 * `properties: null` (the engine asks nothing for them).
 */
export async function getFoodEntriesForClarifiers(
  userId: string,
  filter: { ids?: string[]; date?: string }
): Promise<ClarifierEntryRow[]> {
  const conditions = [eq(timelineEntries.userId, userId), eq(timelineEntries.entryType, "food")];
  if (filter.ids) {
    if (filter.ids.length === 0) return [];
    conditions.push(inArray(timelineEntries.id, filter.ids));
  }
  if (filter.date) conditions.push(eq(timelineEntries.entryDate, filter.date));

  const rows = await db
    .select({
      id: timelineEntries.id,
      foodId: timelineEntries.foodId,
      name: timelineEntries.name,
      structuredContent: timelineEntries.structuredContent,
      foodDisplayName: foods.displayName,
      foodCategory: foodCategories.name,
      histamine: foodTriggerProperties.histamine,
      amines: foodTriggerProperties.amines,
      tyramine: foodTriggerProperties.tyramine,
      fodmap: foodTriggerProperties.fodmap,
      oxalate: foodTriggerProperties.oxalate,
      nightshade: foodTriggerProperties.nightshade,
      salicylate: foodTriggerProperties.salicylate,
      lectin: foodTriggerProperties.lectin,
      glutamates: foodTriggerProperties.glutamates,
      sulfites: foodTriggerProperties.sulfites,
      hasProps: foodTriggerProperties.id,
    })
    .from(timelineEntries)
    .leftJoin(foods, eq(timelineEntries.foodId, foods.id))
    .leftJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .leftJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(and(...conditions))
    .orderBy(timelineEntries.entryTime, timelineEntries.createdAt);

  return rows.map((r) => ({
    id: r.id,
    foodId: r.foodId,
    name: r.name,
    foodDisplayName: r.foodDisplayName,
    foodCategory: r.foodCategory,
    structuredContent: (r.structuredContent as Record<string, unknown> | null) ?? null,
    properties: r.hasProps
      ? {
          histamine: (r.histamine ?? "unknown") as PropertyLevel,
          amines: (r.amines ?? "unknown") as PropertyLevel,
          tyramine: (r.tyramine ?? "unknown") as PropertyLevel,
          fodmap: (r.fodmap ?? "unknown") as PropertyLevel,
          oxalate: (r.oxalate ?? "unknown") as PropertyLevel,
          nightshade: r.nightshade ?? false,
          salicylate: (r.salicylate ?? "unknown") as PropertyLevel,
          lectin: (r.lectin ?? "unknown") as PropertyLevel,
          glutamates: (r.glutamates ?? "unknown") as PropertyLevel,
          sulfites: (r.sulfites ?? "unknown") as PropertyLevel,
        }
      : null,
  }));
}

/** The user's current protocol id, or null. */
export async function getUserProtocolId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ currentProtocolId: profiles.currentProtocolId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.currentProtocolId ?? null;
}

/** Prior responses for this user across the given foods, keyed by foodId. */
export async function getClarifierHistory(
  userId: string,
  foodIds: string[]
): Promise<Map<string, ClarifierHistory[]>> {
  const map = new Map<string, ClarifierHistory[]>();
  if (foodIds.length === 0) return map;
  const rows = await db
    .select({
      foodId: clarifierResponses.foodId,
      dimension: clarifierResponses.dimension,
      answer: clarifierResponses.answer,
      answerCount: clarifierResponses.answerCount,
      skipCount: clarifierResponses.skipCount,
    })
    .from(clarifierResponses)
    .where(and(eq(clarifierResponses.userId, userId), inArray(clarifierResponses.foodId, foodIds)));
  for (const r of rows) {
    const list = map.get(r.foodId) ?? [];
    list.push({
      dimension: r.dimension as ClarifierDimension,
      answer: r.answer,
      answerCount: r.answerCount,
      skipCount: r.skipCount,
    });
    map.set(r.foodId, list);
  }
  return map;
}

/** Most frequent non-skip answer per dimension across all of the user's foods. */
export async function getUserClarifierDefaults(
  userId: string
): Promise<Partial<Record<ClarifierDimension, string>>> {
  const rows = await db
    .select({
      dimension: clarifierResponses.dimension,
      answer: clarifierResponses.answer,
      total: sql<number>`sum(${clarifierResponses.answerCount})`.mapWith(Number),
    })
    .from(clarifierResponses)
    .where(and(eq(clarifierResponses.userId, userId), sql`${clarifierResponses.answer} IS NOT NULL`))
    .groupBy(clarifierResponses.dimension, clarifierResponses.answer)
    .orderBy(desc(sql`sum(${clarifierResponses.answerCount})`));

  const defaults: Partial<Record<ClarifierDimension, string>> = {};
  for (const r of rows) {
    const dim = r.dimension as ClarifierDimension;
    // Multi-select answers are comma-joined; only suggest single values.
    if (defaults[dim] === undefined && r.answer && !r.answer.includes(",") && r.total >= 2) {
      defaults[dim] = r.answer;
    }
  }
  return defaults;
}

/** Number of responses (answers + skips) recorded on `date` (YYYY-MM-DD, server-local). */
export async function countClarifierResponsesOn(userId: string, date: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(clarifierResponses)
    .where(and(eq(clarifierResponses.userId, userId), sql`${clarifierResponses.lastAt}::date = ${date}::date`));
  return row?.n ?? 0;
}

/**
 * Record an answer (or a skip when `answer` is null) for (user, food, dimension).
 * Upserts: an answer increments answer_count and replaces the stored answer;
 * a skip increments skip_count only.
 */
export async function recordClarifierResponse(
  userId: string,
  foodId: string,
  dimension: ClarifierDimension,
  answer: string | null
): Promise<void> {
  const isSkip = answer === null;
  await db
    .insert(clarifierResponses)
    .values({
      userId,
      foodId,
      dimension,
      answer: isSkip ? null : answer,
      answerCount: isSkip ? 0 : 1,
      skipCount: isSkip ? 1 : 0,
      lastAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [clarifierResponses.userId, clarifierResponses.foodId, clarifierResponses.dimension],
      set: isSkip
        ? { skipCount: sql`${clarifierResponses.skipCount} + 1`, lastAt: new Date() }
        : {
            answer,
            answerCount: sql`${clarifierResponses.answerCount} + 1`,
            lastAt: new Date(),
          },
    });
}

/**
 * Write a clarifier value into the entry's structured_content without
 * clobbering other keys. Returns the updated row or null when not owned.
 */
export async function setEntryClarifierValue(
  userId: string,
  entryId: string,
  dimension: ClarifierDimension,
  value: string | string[]
) {
  const patch = JSON.stringify({ [dimension]: value });
  const [updated] = await db
    .update(timelineEntries)
    .set({
      structuredContent: sql`COALESCE(${timelineEntries.structuredContent}, '{}'::jsonb) || ${patch}::jsonb`,
      updatedAt: new Date(),
    })
    .where(and(eq(timelineEntries.id, entryId), eq(timelineEntries.userId, userId)))
    .returning({ id: timelineEntries.id, foodId: timelineEntries.foodId, structuredContent: timelineEntries.structuredContent });
  return updated ?? null;
}
