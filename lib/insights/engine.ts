import { getCompositesForRange, computeAndStoreDayComposite, backfillComposites } from './day-composite-db';
import { analyzeSingleFactors } from './single-factor';
import { analyzeMultiFactors } from './n-factor';
import { computeProgress } from './progress';
import { detectNewAlerts } from './alerts';
import type { InsightsOutput, SingleFactorResult, PropertyPattern } from './types';
import { insightKey } from './types';
import { db } from '@/lib/db';
import { insightSnapshots, insightAlerts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function runInsightsEngine(userId: string, days: number = 90): Promise<InsightsOutput> {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split('T')[0];

  // Backfill any days that have entries but no composite yet
  await backfillComposites(userId, start, today);

  // Ensure today's composite is fresh
  await computeAndStoreDayComposite(userId, today);

  const composites = await getCompositesForRange(userId, start, today);

  if (composites.length === 0) {
    return emptyOutput(0, days);
  }

  const singleResults = analyzeSingleFactors(composites);

  const triggerCategories = new Set(['food', 'food_property', 'preparation', 'quantity', 'addition', 'medication', 'exposure', 'stress', 'timing']);
  const singleTriggers = singleResults.filter(r => triggerCategories.has(r.factor.category));
  const singleHelpers = singleResults.filter(r => !triggerCategories.has(r.factor.category));

  const multiResults = analyzeMultiFactors(composites, singleResults);
  const multiTriggers = multiResults.filter(r => r.factors.some(f => triggerCategories.has(f.category)));
  const multiHelpers = multiResults.filter(r => !r.factors.some(f => triggerCategories.has(f.category)));

  const absorbedKeys = new Set<string>();
  for (const mr of multiResults) {
    for (const ak of mr.absorbed) absorbedKeys.add(ak);
  }

  const filteredSingleTriggers = singleTriggers.filter(r => !absorbedKeys.has(insightKey([r.factor], r.outcome)));
  const filteredSingleHelpers = singleHelpers.filter(r => !absorbedKeys.has(insightKey([r.factor], r.outcome)));

  const propertyPatterns = extractPropertyPatterns(singleResults);
  const progress = computeProgress(composites, today);

  const output: InsightsOutput = {
    triggers: [...multiTriggers, ...filteredSingleTriggers].sort((a, b) => b.impactScore - a.impactScore),
    helpers: [...multiHelpers, ...filteredSingleHelpers].sort((a, b) => b.impactScore - a.impactScore),
    propertyPatterns,
    progress,
    dataStatus: {
      daysTracked: composites.length,
      daysAnalyzed: days,
      loggingConsistency: composites.length / days,
      singleFactors: singleResults.length,
      twoFactorPatterns: multiResults.filter(r => r.factorCount === 2).length,
      threeFactorPatterns: multiResults.filter(r => r.factorCount === 3).length,
    },
  };

  await saveSnapshotAndAlerts(userId, output, days);

  return output;
}

async function saveSnapshotAndAlerts(userId: string, output: InsightsOutput, daysAnalyzed: number) {
  const prev = await db.select().from(insightSnapshots)
    .where(eq(insightSnapshots.userId, userId))
    .orderBy(desc(insightSnapshots.computedAt))
    .limit(1);

  const previousKeys = new Set<string>();
  if (prev.length > 0) {
    const prevTriggers = (prev[0].triggers ?? []) as Array<{ factors?: Array<{ key: string }>; factor?: { key: string }; outcome: { key: string } }>;
    const prevHelpers = (prev[0].helpers ?? []) as typeof prevTriggers;
    for (const r of [...prevTriggers, ...prevHelpers]) {
      const factors = r.factors ?? (r.factor ? [r.factor] : []);
      const fKeys = factors.map(f => f.key).sort().join('+');
      previousKeys.add(`${fKeys}→${r.outcome.key}`);
    }
  }

  await db.insert(insightSnapshots).values({
    userId,
    daysAnalyzed,
    triggers: output.triggers as unknown as Record<string, unknown>,
    helpers: output.helpers as unknown as Record<string, unknown>,
    patterns: output.propertyPatterns as unknown as Record<string, unknown>,
    progress: output.progress as unknown as Record<string, unknown>,
    singleCount: output.dataStatus.singleFactors,
    twoFactorCount: output.dataStatus.twoFactorPatterns,
    threeFactorCount: output.dataStatus.threeFactorPatterns,
  });

  const newAlerts = detectNewAlerts(output, previousKeys);
  if (newAlerts.length > 0) {
    await db.insert(insightAlerts).values(
      newAlerts.map(a => ({ userId, ...a })),
    );
  }
}

function extractPropertyPatterns(singleResults: SingleFactorResult[]): PropertyPattern[] {
  const byPropertyOutcome = new Map<string, { property: string; severity: string; outcome: SingleFactorResult['outcome']; frequency: number; impact: number }>();

  for (const r of singleResults) {
    if (r.factor.category !== 'food_property') continue;
    const compositeKey = `${r.factor.key}→${r.outcome.key}`;

    if (!byPropertyOutcome.has(compositeKey)) {
      const parts = r.factor.key.replace('food_property:', '').split('_');
      const severity = parts.pop() ?? 'high';
      const property = parts.join('_');
      byPropertyOutcome.set(compositeKey, { property, severity, outcome: r.outcome, frequency: r.frequency, impact: r.impactScore });
    }
  }

  const patterns: PropertyPattern[] = [];
  for (const [, data] of byPropertyOutcome) {
    if (data.frequency < 3) continue;
    patterns.push({
      property: data.property,
      severity: data.severity,
      foods: [],
      outcome: data.outcome,
      frequency: data.frequency,
      impactScore: data.impact,
      description: `${capitalize(data.severity)} ${data.property} foods → ${data.outcome.label.toLowerCase()} (seen ${data.frequency} times)`,
    });
  }

  return patterns;
}

function emptyOutput(tracked: number, analyzed: number): InsightsOutput {
  return {
    triggers: [], helpers: [], propertyPatterns: [], progress: [],
    dataStatus: { daysTracked: tracked, daysAnalyzed: analyzed, loggingConsistency: 0, singleFactors: 0, twoFactorPatterns: 0, threeFactorPatterns: 0 },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
