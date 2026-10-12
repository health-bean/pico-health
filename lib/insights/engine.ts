import { getCompositesForRange, computeAndStoreDayComposite, backfillComposites } from './day-composite-db';
import { detectNewAlerts } from './alerts';
import { assembleInsights } from './assemble';
import type { InsightsOutput } from './types';
import { db } from '@/lib/db';
import { insightSnapshots, insightAlerts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export { parsePropertyKey } from './assemble';

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

  const output = assembleInsights(composites, today, days);

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
    // Progress milestones use their own key shape. Without this they were
    // never recognised as already-known, so every run raised the same
    // "Brain Fog frequency" alert again.
    const prevProgress = (prev[0].progress ?? []) as Array<{ metric: string }>;
    for (const o of prevProgress) previousKeys.add(`progress:${o.metric}`);
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

function emptyOutput(tracked: number, analyzed: number): InsightsOutput {
  return {
    triggers: [], helpers: [], propertyPatterns: [], progress: [],
    dataStatus: { daysTracked: tracked, daysAnalyzed: analyzed, loggingConsistency: 0, singleFactors: 0, twoFactorPatterns: 0, threeFactorPatterns: 0 },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
