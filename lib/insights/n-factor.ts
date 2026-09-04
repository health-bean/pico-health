import type { DayComposite, Factor, Outcome, SingleFactorResult, MultiFactorResult } from './types';
import { extractFactorsFromDay, extractOutcomesFromDay, computeConfidence } from './single-factor';
import { insightKey } from './types';

const pct = (n: number) => `${Math.round(n * 100)}%`;

const MIN_2_FACTOR = 5;
const MIN_3_FACTOR = 7;
const PROMOTION_THRESHOLD_2 = 1.5;
const PROMOTION_THRESHOLD_3 = 1.3;

export function analyzeMultiFactors(
  days: DayComposite[],
  singleResults: SingleFactorResult[],
): MultiFactorResult[] {
  const results: MultiFactorResult[] = [];

  const dayFactors = days.map(d => new Set(extractFactorsFromDay(d).map(f => f.key)));
  const dayOutcomes = days.map(d => new Set(extractOutcomesFromDay(d).map(o => o.key)));

  const outcomeMap = new Map<string, Outcome>();
  const factorMap = new Map<string, Factor>();
  for (const sr of singleResults) {
    outcomeMap.set(sr.outcome.key, sr.outcome);
    factorMap.set(sr.factor.key, sr.factor);
  }

  const byOutcome = new Map<string, SingleFactorResult[]>();
  for (const sr of singleResults) {
    const key = sr.outcome.key;
    if (!byOutcome.has(key)) byOutcome.set(key, []);
    byOutcome.get(key)!.push(sr);
  }

  const twoFactorResults: MultiFactorResult[] = [];

  for (const [outcomeKey, singles] of byOutcome) {
    const outcome = outcomeMap.get(outcomeKey)!;

    for (let i = 0; i < singles.length; i++) {
      for (let j = i + 1; j < singles.length; j++) {
        const fA = singles[i].factor;
        const fB = singles[j].factor;

        let coOccurrences = 0;
        let bothFactorDays = 0;
        let lastCoDayIdx = -1;

        for (let d = 0; d < days.length; d++) {
          const hasA = dayFactors[d].has(fA.key);
          const hasB = dayFactors[d].has(fB.key);
          const hasO = dayOutcomes[d].has(outcomeKey);

          if (hasA && hasB) {
            bothFactorDays++;
            if (hasO) {
              coOccurrences++;
              lastCoDayIdx = d;
            }
          }
        }

        if (coOccurrences < MIN_2_FACTOR) continue;

        const conditionalRate = coOccurrences / bothFactorDays;
        const bestSubRate = Math.max(singles[i].conditionalRate, singles[j].conditionalRate);
        const rateMultiplier = bestSubRate > 0 ? conditionalRate / bestSubRate : 10;

        if (rateMultiplier < PROMOTION_THRESHOLD_2) continue;

        const recencyDays = lastCoDayIdx >= 0 ? days.length - 1 - lastCoDayIdx : 999;
        const impactScore = computeMultiImpact(rateMultiplier, coOccurrences, recencyDays, 2);

        const absorbed = [
          insightKey([fA], outcome),
          insightKey([fB], outcome),
        ];

        twoFactorResults.push({
          factors: [fA, fB],
          factorCount: 2,
          outcome,
          frequency: coOccurrences,
          coOccurrences: bothFactorDays,
          conditionalRate,
          bestSubRate,
          rateMultiplier,
          recencyDays,
          impactScore,
          direction: 'increases',
          confidence: computeConfidence(rateMultiplier, coOccurrences),
          description: `${outcome.label} on ${coOccurrences} of ${bothFactorDays} days you had both ${fA.label.toLowerCase()} and ${fB.label.toLowerCase()} (${pct(conditionalRate)}) — more than either alone (${pct(bestSubRate)}).`,
          absorbed,
        });
      }
    }
  }

  results.push(...twoFactorResults);

  for (const twoF of twoFactorResults) {
    const outcomeSingles = byOutcome.get(twoF.outcome.key) ?? [];

    for (const single of outcomeSingles) {
      if (twoF.factors.some(f => f.key === single.factor.key)) continue;

      const fC = single.factor;
      let coOccurrences = 0;
      let allThreeDays = 0;
      let lastCoDayIdx = -1;

      for (let d = 0; d < days.length; d++) {
        const hasAll = twoF.factors.every(f => dayFactors[d].has(f.key)) && dayFactors[d].has(fC.key);
        const hasO = dayOutcomes[d].has(twoF.outcome.key);

        if (hasAll) {
          allThreeDays++;
          if (hasO) {
            coOccurrences++;
            lastCoDayIdx = d;
          }
        }
      }

      if (coOccurrences < MIN_3_FACTOR) continue;

      const conditionalRate = coOccurrences / allThreeDays;
      const rateMultiplier = twoF.conditionalRate > 0 ? conditionalRate / twoF.conditionalRate : 10;

      if (rateMultiplier < PROMOTION_THRESHOLD_3) continue;

      const recencyDays = lastCoDayIdx >= 0 ? days.length - 1 - lastCoDayIdx : 999;
      const impactScore = computeMultiImpact(rateMultiplier, coOccurrences, recencyDays, 3);

      const allFactors = [...twoF.factors, fC];
      const absorbed = [
        insightKey(twoF.factors, twoF.outcome),
        ...twoF.absorbed,
        insightKey([fC], twoF.outcome),
      ];

      results.push({
        factors: allFactors,
        factorCount: 3,
        outcome: twoF.outcome,
        frequency: coOccurrences,
        coOccurrences: allThreeDays,
        conditionalRate,
        bestSubRate: twoF.conditionalRate,
        rateMultiplier,
        recencyDays,
        impactScore,
        direction: 'increases',
        confidence: computeConfidence(rateMultiplier, coOccurrences),
        description: `${twoF.outcome.label} on ${coOccurrences} of ${allThreeDays} days you had ${allFactors.map(f => f.label.toLowerCase()).join(', ')} together (${pct(conditionalRate)}).`,
        absorbed,
      });
    }
  }

  return results.sort((a, b) => b.impactScore - a.impactScore);
}

function computeMultiImpact(rateMultiplier: number, frequency: number, recencyDays: number, factorCount: number): number {
  const multiplierScore = Math.min(rateMultiplier / 5, 1) * 0.4;
  const frequencyScore = Math.min(frequency / 15, 1) * 0.3;
  const recencyScore = Math.max(0, 1 - recencyDays / 90) * 0.15;
  const complexityBonus = factorCount === 3 ? 0.15 : factorCount === 2 ? 0.1 : 0;
  return multiplierScore + frequencyScore + recencyScore + complexityBonus;
}
