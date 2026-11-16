import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dayComposites, timelineEntries, userFoodReactions } from "@/lib/db/schema";
import { invalidateUserInsights } from "@/lib/cache/insights";
import type { PersonalRating, PersonalSource, PersonalStatus } from "@/lib/protocols/fit-line";

export const PERSONAL_STATUSES = ["safe", "sensitive", "unsafe"] as const;

/** A person's own ratings for the given foods (all of them if none given). */
export async function loadPersonalRatings(userId: string, foodIds?: string[]): Promise<Map<string, PersonalRating>> {
  if (foodIds && foodIds.length === 0) return new Map();
  const rows = await db
    .select({ foodId: userFoodReactions.foodId, status: userFoodReactions.status, source: userFoodReactions.source })
    .from(userFoodReactions)
    .where(
      foodIds
        ? and(eq(userFoodReactions.userId, userId), inArray(userFoodReactions.foodId, foodIds))
        : eq(userFoodReactions.userId, userId)
    );
  const out = new Map<string, PersonalRating>();
  for (const r of rows) {
    if (r.foodId) out.set(r.foodId, { status: r.status as PersonalStatus, source: r.source as PersonalSource });
  }
  return out;
}

/** How often the person has logged a food: the evidence behind a self-set rating. */
async function logEvidence(userId: string, foodId: string) {
  const [row] = await db
    .select({
      timesLogged: sql<number>`count(*)::int`,
      firstLogged: sql<string | null>`min(${timelineEntries.entryDate})::text`,
      lastLogged: sql<string | null>`max(${timelineEntries.entryDate})::text`,
    })
    .from(timelineEntries)
    .where(and(eq(timelineEntries.userId, userId), eq(timelineEntries.foodId, foodId)));
  return row ?? { timesLogged: 0, firstLogged: null, lastLogged: null };
}

/**
 * Cached insight days that include this food were built with the old status;
 * drop them so they rebuild, and clear the cached insights.
 */
async function refreshInsights(userId: string, foodId: string) {
  await db.execute(sql`
    delete from ${dayComposites}
    where ${dayComposites.userId} = ${userId}
      and ${dayComposites.date} in (
        select distinct ${timelineEntries.entryDate} from ${timelineEntries}
        where ${timelineEntries.userId} = ${userId} and ${timelineEntries.foodId} = ${foodId}
      )`);
  await invalidateUserInsights(userId);
}

export async function setPersonalRating(input: {
  userId: string;
  foodId: string;
  foodName: string;
  status: PersonalStatus;
  source: PersonalSource;
  notes?: string | null;
  amountNote?: string | null;
  reintroductionId?: string | null;
  evidence?: Record<string, unknown>;
}) {
  const evidence = input.evidence ?? (await logEvidence(input.userId, input.foodId));
  const today = new Date().toISOString().split("T")[0];
  const values = {
    status: input.status,
    source: input.source,
    foodName: input.foodName,
    notes: input.notes ?? null,
    amountNote: input.amountNote ?? null,
    reintroductionId: input.reintroductionId ?? null,
    evidence,
    confirmedDate: today,
    updatedAt: new Date(),
  };
  // One row per person per food; the newest rating replaces the old one.
  const [existing] = await db
    .select({ id: userFoodReactions.id })
    .from(userFoodReactions)
    .where(and(eq(userFoodReactions.userId, input.userId), eq(userFoodReactions.foodId, input.foodId)))
    .limit(1);
  if (existing) {
    await db.update(userFoodReactions).set(values).where(eq(userFoodReactions.id, existing.id));
  } else {
    // A legacy row may hold the same name without a food id.
    await db
      .delete(userFoodReactions)
      .where(and(eq(userFoodReactions.userId, input.userId), eq(userFoodReactions.foodName, input.foodName)));
    await db.insert(userFoodReactions).values({ userId: input.userId, foodId: input.foodId, ...values });
  }
  await refreshInsights(input.userId, input.foodId);
}

export async function clearPersonalRating(userId: string, foodId: string) {
  await db
    .delete(userFoodReactions)
    .where(and(eq(userFoodReactions.userId, userId), eq(userFoodReactions.foodId, foodId)));
  await refreshInsights(userId, foodId);
}

/**
 * A finished reintroduction trial becomes the person's own rating: passed →
 * fine for you, failed → not for you. Inconclusive or cancelled trials don't
 * change anything. Trials not linked to a catalog food are skipped.
 */
export async function recordTrialResult(trial: {
  id: string;
  userId: string;
  foodId: string | null;
  foodName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  outcome: string | null;
  symptomsSummary?: unknown;
}) {
  if (!trial.foodId || (trial.status !== "passed" && trial.status !== "failed")) return;
  await setPersonalRating({
    userId: trial.userId,
    foodId: trial.foodId,
    foodName: trial.foodName,
    status: trial.status === "passed" ? "safe" : "unsafe",
    source: "trial",
    reintroductionId: trial.id,
    evidence: {
      trialStart: trial.startDate,
      trialEnd: trial.endDate,
      outcome: trial.outcome,
      symptoms: trial.symptomsSummary ?? null,
    },
  });
}

/** Everything on a person's own list, for the My list screen and insights. */
export async function listPersonalRatings(userId: string) {
  return db
    .select({
      foodId: userFoodReactions.foodId,
      foodName: userFoodReactions.foodName,
      status: userFoodReactions.status,
      source: userFoodReactions.source,
      evidence: userFoodReactions.evidence,
      amountNote: userFoodReactions.amountNote,
      notes: userFoodReactions.notes,
      updatedAt: userFoodReactions.updatedAt,
    })
    .from(userFoodReactions)
    .where(eq(userFoodReactions.userId, userId))
    .orderBy(userFoodReactions.foodName);
}
