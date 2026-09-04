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

  // Direction, not category, decides which list a result belongs in: a
  // trigger makes the outcome MORE likely, a helper makes it LESS likely.
  const singleTriggers = singleResults.filter(r => r.direction === 'increases');
  const singleHelpers = singleResults.filter(r => r.direction === 'decreases');

  // Combinations are only sought among triggers — "A and B together" is a
  // trigger story; helpers stand on their own.
  const multiResults = analyzeMultiFactors(composites, singleTriggers);

  const absorbedKeys = new Set<string>();
  for (const mr of multiResults) {
    for (const ak of mr.absorbed) absorbedKeys.add(ak);
  }

  const filteredSingleTriggers = singleTriggers.filter(r => !absorbedKeys.has(insightKey([r.factor], r.outcome)));

  const propertyPatterns = extractPropertyPatterns(singleTriggers);
  const progress = computeProgress(composites, today);

  // Property-level results get their own section ("Patterns to Watch");
  // the Triggers list is for concrete things a person can point at.
  const concreteTriggers = filteredSingleTriggers.filter(r => r.factor.category !== 'food_property');

  const output: InsightsOutput = {
    triggers: [...multiResults, ...concreteTriggers].sort((a, b) => b.impactScore - a.impactScore),
    helpers: singleHelpers.sort((a, b) => b.impactScore - a.impactScore),
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

const SEVERITY_SUFFIXES = ['very_high', 'high', 'moderate', 'low'] as const;

/** `food_property:oxalate_very_high` → { property: 'oxalate', severity: 'very_high' }. */
export function parsePropertyKey(key: string): { property: string; severity: string } {
  const body = key.replace('food_property:', '');
  for (const sev of SEVERITY_SUFFIXES) {
    if (body.endsWith(`_${sev}`)) return { property: body.slice(0, -(sev.length + 1)), severity: sev };
  }
  const idx = body.lastIndexOf('_');
  return idx > 0 ? { property: body.slice(0, idx), severity: body.slice(idx + 1) } : { property: body, severity: 'high' };
}

function extractPropertyPatterns(singleResults: SingleFactorResult[]): PropertyPattern[] {
  const byPropertyOutcome = new Map<string, { property: string; severity: string; outcome: SingleFactorResult['outcome']; frequency: number; impact: number; total: number; rate: number; base: number }>();

  for (const r of singleResults) {
    if (r.factor.category !== 'food_property') continue;
    const compositeKey = `${r.factor.key}→${r.outcome.key}`;

    if (!byPropertyOutcome.has(compositeKey)) {
      const { property, severity } = parsePropertyKey(r.factor.key);
      byPropertyOutcome.set(compositeKey, { property, severity, outcome: r.outcome, frequency: r.frequency, impact: r.impactScore, total: r.totalOpportunities, rate: r.conditionalRate, base: r.baseRate });
    }
  }

  const patterns: PropertyPattern[] = [];
  for (const [, data] of byPropertyOutcome) {
    if (data.frequency < 3) continue;
    const sev = data.severity.replace('_', ' ');
    patterns.push({
      property: data.property,
      severity: data.severity,
      foods: [],
      outcome: data.outcome,
      frequency: data.frequency,
      impactScore: data.impact,
      description: `${data.outcome.label} on ${data.frequency} of ${data.total} days with ${sev}-${data.property} foods (${Math.round(data.rate * 100)}%), vs ${Math.round(data.base * 100)}% of other days.`,
    });
  }

  return patterns.sort((a, b) => b.impactScore - a.impactScore);
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
