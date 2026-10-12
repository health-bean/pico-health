import { analyzeSingleFactors } from './single-factor';
import { analyzeMultiFactors } from './n-factor';
import { computeProgress } from './progress';
import type { DayComposite, InsightsOutput, SingleFactorResult, PropertyPattern } from './types';
import { insightKey } from './types';

/**
 * Everything the engine concludes from a set of days, with no I/O. Split out
 * so the noise check (`null-sim.ts`) runs exactly what production runs.
 */
export function assembleInsights(composites: DayComposite[], today: string, days: number): InsightsOutput {
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

  // A property row is a claim about a whole class of foods, so it needs the
  // same evidence as any row shown by default; early ones were slipping
  // through on 3 co-occurring days with no confidence check at all.
  const propertyPatterns = extractPropertyPatterns(singleTriggers.filter(r => r.confidence !== 'early'));
  const progress = computeProgress(composites, today);

  // Property-level results get their own section ("Patterns to Watch");
  // the Triggers list is for concrete things a person can point at.
  const concreteTriggers = filteredSingleTriggers.filter(r => r.factor.category !== 'food_property');

  return {
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
      totalOpportunities: data.total,
      impactScore: data.impact,
      description: `${data.outcome.label} on ${data.frequency} of ${data.total} days with ${sev}-${data.property} foods (${Math.round(data.rate * 100)}%), vs ${Math.round(data.base * 100)}% of other days.`,
    });
  }

  return patterns.sort((a, b) => b.impactScore - a.impactScore);
}
