import { selectClarifier } from "./engine";
import { CLARIFIER_RULES } from "./rules";
import type { Clarifier, ClarifierDimension, PropertyAxis } from "./types";
import {
  countClarifierResponsesOn,
  getClarifierHistory,
  getFoodEntriesForClarifiers,
  getUserClarifierDefaults,
  getUserProtocolId,
  recordClarifierResponse,
  setEntryClarifierValue,
} from "@/lib/db/queries/clarifiers";
import { getUserProtocolContext } from "@/lib/protocols";

const AXES = new Set<string>([
  "histamine", "amines", "tyramine", "fodmap", "oxalate",
  "nightshade", "salicylate", "lectin", "glutamates", "sulfites",
]);

/**
 * Axes the user's protocol restricts: property rules with status
 * avoid/moderation. Returns null when the user has no protocol so the engine
 * falls back to "any high axis".
 */
export async function getProtocolAxes(userId: string): Promise<Set<PropertyAxis> | null> {
  const protocolId = await getUserProtocolId(userId);
  if (!protocolId) return null;
  const ctx = await getUserProtocolContext(userId, protocolId);
  if (!ctx) return null;
  const axes = new Set<PropertyAxis>();
  for (const rule of ctx.rules) {
    if (
      rule.ruleType === "property" &&
      rule.propertyName &&
      AXES.has(rule.propertyName) &&
      (rule.status === "avoid" || rule.status === "moderation")
    ) {
      axes.add(rule.propertyName as PropertyAxis);
    }
  }
  return axes;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Run the engine over a set of food entries. `limit` caps how many
 * clarifiers come back (1 for a capture card, 3 for Reflect); the daily cap
 * is enforced on top via `answeredToday`.
 */
async function clarifiersFor(
  userId: string,
  filter: { ids?: string[]; date?: string },
  limit: number
): Promise<Clarifier[]> {
  const entries = await getFoodEntriesForClarifiers(userId, filter);
  const withFood = entries.filter((e) => e.foodId && e.properties);
  if (withFood.length === 0) return [];

  const foodIds = [...new Set(withFood.map((e) => e.foodId!))];
  const [protocolAxes, history, userDefaults, answeredToday] = await Promise.all([
    getProtocolAxes(userId),
    getClarifierHistory(userId, foodIds),
    getUserClarifierDefaults(userId),
    countClarifierResponsesOn(userId, todayISO()),
  ]);

  const out: Clarifier[] = [];
  const seenFoodDimension = new Set<string>();
  for (const e of withFood) {
    const c = selectClarifier({
      entry: {
        id: e.id,
        foodId: e.foodId,
        foodName: e.foodDisplayName ?? e.name,
        foodCategory: e.foodCategory,
        structuredContent: e.structuredContent,
      },
      properties: e.properties,
      protocolAxes,
      history: history.get(e.foodId!) ?? [],
      userDefaults,
      // Count what we're about to ask so a single request can't exceed the cap.
      answeredToday: answeredToday + out.length,
    });
    if (!c) continue;
    // Same food logged twice today → ask once.
    const key = `${c.foodId}:${c.dimension}`;
    if (seenFoodDimension.has(key)) continue;
    seenFoodDimension.add(key);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

export function getClarifiersForEntries(userId: string, entryIds: string[]): Promise<Clarifier[]> {
  return clarifiersFor(userId, { ids: entryIds }, 1);
}

export function getPendingClarifiers(userId: string, date: string, limit = 3): Promise<Clarifier[]> {
  return clarifiersFor(userId, { date }, limit);
}

export type AnswerResult =
  | { ok: true; structuredContent: Record<string, unknown> | null }
  | { ok: false; reason: "not_found" | "invalid_answer" };

/**
 * Apply an answer (or skip) for one entry. Validates the answer against the
 * rule's options, writes it into structured_content, and records the
 * response for this user × food × dimension.
 */
export async function answerClarifier(
  userId: string,
  entryId: string,
  dimension: ClarifierDimension,
  answer: string[] | "skipped"
): Promise<AnswerResult> {
  const [entry] = await getFoodEntriesForClarifiers(userId, { ids: [entryId] });
  if (!entry || !entry.foodId) return { ok: false, reason: "not_found" };

  if (answer === "skipped") {
    await recordClarifierResponse(userId, entry.foodId, dimension, null);
    return { ok: true, structuredContent: entry.structuredContent };
  }

  const allowed = new Set(
    CLARIFIER_RULES.filter((r) => r.dimension === dimension).flatMap((r) => r.options.map((o) => o.value))
  );
  if (answer.length === 0 || answer.some((a) => !allowed.has(a))) {
    return { ok: false, reason: "invalid_answer" };
  }
  const multi = CLARIFIER_RULES.some((r) => r.dimension === dimension && r.multi);
  // preparation is a list in structured_content even though the question is single-choice.
  const value: string | string[] = multi || dimension === "preparation" ? answer : answer[0];

  const updated = await setEntryClarifierValue(userId, entryId, dimension, value);
  if (!updated) return { ok: false, reason: "not_found" };
  await recordClarifierResponse(userId, entry.foodId, dimension, answer.join(","));
  return { ok: true, structuredContent: (updated.structuredContent as Record<string, unknown> | null) ?? null };
}
