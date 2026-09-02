import { db } from '@/lib/db';
import {
  dayComposites, timelineEntries, journalEntries,
  foodTriggerProperties, profiles,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { buildDayComposite } from './day-composite';
import { loadProtocolContext, checkComplianceSync } from '@/lib/protocols/compliance';
import type { DayComposite, FoodProperty } from './types';
import type { FoodProperties } from '@/lib/protocols/compliance';

export async function getOrComputeDayComposite(userId: string, date: string): Promise<DayComposite | null> {
  const existing = await db.select().from(dayComposites)
    .where(and(eq(dayComposites.userId, userId), eq(dayComposites.date, date)))
    .limit(1);

  if (existing.length > 0) {
    return rowToComposite(existing[0]);
  }

  return computeAndStoreDayComposite(userId, date);
}

export async function computeAndStoreDayComposite(userId: string, date: string): Promise<DayComposite | null> {
  const [entries, journal, profile] = await Promise.all([
    db.select().from(timelineEntries)
      .where(and(eq(timelineEntries.userId, userId), eq(timelineEntries.entryDate, date))),
    db.select().from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, date)))
      .limit(1),
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
  ]);

  if (entries.length === 0 && journal.length === 0) return null;

  const foodIds = entries
    .filter(e => e.foodId)
    .map(e => e.foodId!);

  const foodPropsMap = await loadFoodProperties(foodIds);

  let protocolCtx = null;
  const protocolId = profile[0]?.currentProtocolId;
  if (protocolId) {
    const ctx = await loadProtocolContext(protocolId, null, foodIds);
    protocolCtx = {
      protocolId,
      checkCompliance: (foodId: string | null, props: FoodProperty[]) => {
        const foodProps: FoodProperties = {};
        for (const p of props) {
          (foodProps as Record<string, string>)[p.property] = p.severity;
        }
        return checkComplianceSync(ctx, foodProps, foodId);
      },
    };
  }

  const rawEntries = entries.map(e => ({
    entryType: e.entryType,
    name: e.name,
    severity: e.severity,
    entryTime: e.entryTime,
    foodId: e.foodId,
    mealType: e.mealType,
    portion: e.portion,
    exerciseType: e.exerciseType,
    durationMinutes: e.durationMinutes,
    intensityLevel: e.intensityLevel,
    energyLevel: e.energyLevel,
  }));

  const composite = buildDayComposite(
    userId, date, rawEntries, journal[0] ?? null, foodPropsMap, protocolCtx,
  );

  await db.insert(dayComposites).values({
    userId: composite.userId,
    date: composite.date,
    foodCount: composite.foodCount,
    symptomCount: composite.symptomCount,
    supplementCount: composite.supplementCount,
    medicationCount: composite.medicationCount,
    exposureCount: composite.exposureCount,
    exerciseCount: composite.exerciseCount,
    sleepScore: composite.journal.sleep,
    energyScore: composite.journal.energy,
    moodScore: composite.journal.mood,
    stressScore: composite.journal.stress,
    painScore: composite.journal.pain,
    protocolId: composite.protocolId,
    compliancePct: composite.compliancePct?.toString() ?? null,
    violationCount: composite.violationCount,
    foods: composite.foods as unknown as Record<string, unknown>,
    symptoms: composite.symptoms as unknown as Record<string, unknown>,
    supplements: composite.supplements as unknown as Record<string, unknown>,
    medications: composite.medications as unknown as Record<string, unknown>,
    exposures: composite.exposures as unknown as Record<string, unknown>,
    exercises: composite.exercises as unknown as Record<string, unknown>,
    entryCount: composite.entryCount,
    hasJournal: composite.hasJournal,
    isFlareDay: composite.isFlareDay,
    hasLateMeal: composite.hasLateMeal,
  }).onConflictDoUpdate({
    target: [dayComposites.userId, dayComposites.date],
    set: {
      foodCount: composite.foodCount,
      symptomCount: composite.symptomCount,
      supplementCount: composite.supplementCount,
      medicationCount: composite.medicationCount,
      exposureCount: composite.exposureCount,
      exerciseCount: composite.exerciseCount,
      sleepScore: composite.journal.sleep,
      energyScore: composite.journal.energy,
      moodScore: composite.journal.mood,
      stressScore: composite.journal.stress,
      painScore: composite.journal.pain,
      protocolId: composite.protocolId,
      compliancePct: composite.compliancePct?.toString() ?? null,
      violationCount: composite.violationCount,
      foods: composite.foods as unknown as Record<string, unknown>,
      symptoms: composite.symptoms as unknown as Record<string, unknown>,
      supplements: composite.supplements as unknown as Record<string, unknown>,
      medications: composite.medications as unknown as Record<string, unknown>,
      exposures: composite.exposures as unknown as Record<string, unknown>,
      exercises: composite.exercises as unknown as Record<string, unknown>,
      entryCount: composite.entryCount,
      hasJournal: composite.hasJournal,
      isFlareDay: composite.isFlareDay,
      hasLateMeal: composite.hasLateMeal,
    },
  });

  return composite;
}

export async function getCompositesForRange(
  userId: string, startDate: string, endDate: string,
): Promise<DayComposite[]> {
  const rows = await db.select().from(dayComposites)
    .where(and(
      eq(dayComposites.userId, userId),
      gte(dayComposites.date, startDate),
      lte(dayComposites.date, endDate),
    ))
    .orderBy(dayComposites.date);

  return rows.map(rowToComposite);
}

async function loadFoodProperties(foodIds: string[]): Promise<Map<string, FoodProperty[]>> {
  if (foodIds.length === 0) return new Map();

  const props = await db.select().from(foodTriggerProperties)
    .where(inArray(foodTriggerProperties.foodId, foodIds));

  const map = new Map<string, FoodProperty[]>();
  const propertyFields = [
    'oxalate', 'histamine', 'lectin', 'fodmap',
    'salicylate', 'amines', 'glutamates', 'sulfites', 'goitrogens',
    'purines', 'phytoestrogens', 'phytates', 'tyramine',
  ] as const;

  for (const row of props) {
    const entries: FoodProperty[] = [];

    // Handle varchar properties
    for (const field of propertyFields) {
      const value = row[field] as string | null;
      if (value && value !== 'unknown' && value !== 'none') {
        entries.push({ property: field, severity: value });
      }
    }

    // Handle nightshade boolean
    if (row.nightshade) {
      entries.push({ property: 'nightshade', severity: 'high' });
    }

    map.set(row.foodId, entries);
  }
  return map;
}

export async function backfillComposites(userId: string, startDate: string, endDate: string): Promise<number> {
  // Find all dates that have entries or journal data but no composite yet
  const existingDates = await db.select({ date: dayComposites.date })
    .from(dayComposites)
    .where(and(
      eq(dayComposites.userId, userId),
      gte(dayComposites.date, startDate),
      lte(dayComposites.date, endDate),
    ));

  const existingSet = new Set(existingDates.map(r => r.date));

  // Get all dates with timeline entries
  const entryDates = await db.selectDistinct({ date: timelineEntries.entryDate })
    .from(timelineEntries)
    .where(and(
      eq(timelineEntries.userId, userId),
      gte(timelineEntries.entryDate, startDate),
      lte(timelineEntries.entryDate, endDate),
    ));

  // Get all dates with journal entries
  const journalDates = await db.selectDistinct({ date: journalEntries.entryDate })
    .from(journalEntries)
    .where(and(
      eq(journalEntries.userId, userId),
      gte(journalEntries.entryDate, startDate),
      lte(journalEntries.entryDate, endDate),
    ));

  const allDates = new Set([
    ...entryDates.map(r => r.date),
    ...journalDates.map(r => r.date),
  ]);

  const missingDates = [...allDates].filter(d => !existingSet.has(d)).sort();

  // Process in parallel batches of 10 instead of sequentially
  const BATCH_SIZE = 10;
  for (let i = 0; i < missingDates.length; i += BATCH_SIZE) {
    const batch = missingDates.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(date => computeAndStoreDayComposite(userId, date)));
  }

  return missingDates.length;
}

function rowToComposite(row: typeof dayComposites.$inferSelect): DayComposite {
  return {
    userId: row.userId,
    date: row.date,
    foods: (row.foods ?? []) as DayComposite['foods'],
    symptoms: (row.symptoms ?? []) as DayComposite['symptoms'],
    supplements: (row.supplements ?? []) as DayComposite['supplements'],
    medications: (row.medications ?? []) as DayComposite['medications'],
    exposures: (row.exposures ?? []) as DayComposite['exposures'],
    exercises: (row.exercises ?? []) as DayComposite['exercises'],
    journal: {
      sleep: row.sleepScore, energy: row.energyScore, mood: row.moodScore,
      stress: row.stressScore, pain: row.painScore,
    },
    foodCount: row.foodCount,
    symptomCount: row.symptomCount,
    supplementCount: row.supplementCount,
    medicationCount: row.medicationCount,
    exposureCount: row.exposureCount,
    exerciseCount: row.exerciseCount,
    protocolId: row.protocolId,
    compliancePct: row.compliancePct ? parseFloat(row.compliancePct) : null,
    violationCount: row.violationCount,
    entryCount: row.entryCount,
    hasJournal: row.hasJournal,
    isFlareDay: row.isFlareDay,
    hasLateMeal: row.hasLateMeal,
  };
}
