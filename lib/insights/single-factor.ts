import type { DayComposite, Factor, Outcome, SingleFactorResult } from './types';
import { bucketScore, bucketNegativeScore } from './types';

const MIN_OCCURRENCES = 3;
const MAX_FACTOR_FREQUENCY = 0.70; // Skip factors present on >70% of days — they're constants, not signals
const MIN_WITHOUT_DAYS = 5; // Need at least 5 days WITHOUT the factor for a meaningful base rate
const MAX_RATE_MULTIPLIER = 5; // Cap to avoid infinite/huge multipliers from tiny base rates

/** Labels for clarifier 'additions' values (see lib/clarifiers/rules.ts). */
const ADDITION_LABELS: Record<string, string> = {
  paprika_chili: 'Paprika / chili',
  black_pepper: 'Black pepper',
  cumin_coriander: 'Cumin / coriander',
  seed_oil: 'Seed oil',
  onion: 'Onion',
  garlic: 'Garlic',
};

export function extractFactorsFromDay(day: DayComposite): Factor[] {
  const factors: Factor[] = [];

  for (const food of day.foods) {
    factors.push({ category: 'food', key: `food:${food.name.toLowerCase()}`, label: food.name });
    for (const prop of food.properties) {
      factors.push({
        category: 'food_property',
        key: `food_property:${prop.property}_${prop.severity}`,
        label: `${capitalize(prop.severity)} ${prop.property}`,
      });
    }
    for (const prep of food.preparation ?? []) {
      factors.push({
        category: 'preparation',
        key: `preparation:${prep}`,
        label: `${capitalize(prep)} food`,
      });
    }
    // Clarifier answers. 'usual' quantity is the baseline, not a signal.
    if (food.quantity && food.quantity !== 'usual') {
      factors.push({
        category: 'quantity',
        key: `quantity:${food.quantity}`,
        label: food.quantity === 'more' ? 'Larger portion than usual' : 'Smaller portion than usual',
      });
    }
    for (const add of food.additions ?? []) {
      if (add === 'plain' || add === 'neither') continue;
      factors.push({
        category: 'addition',
        key: `addition:${add}`,
        label: ADDITION_LABELS[add] ?? capitalize(add.replace(/_/g, ' ')),
      });
    }
  }

  for (const s of day.supplements) {
    factors.push({ category: 'supplement', key: `supplement:${s.name.toLowerCase()}`, label: s.name });
  }
  for (const m of day.medications) {
    factors.push({ category: 'medication', key: `medication:${m.name.toLowerCase()}`, label: m.name });
  }
  for (const e of day.exposures) {
    factors.push({ category: 'exposure', key: `exposure:${e.type.toLowerCase()}`, label: e.type });
  }
  for (const ex of day.exercises) {
    factors.push({ category: 'exercise', key: `exercise:${ex.type.toLowerCase()}_${ex.intensity}`, label: `${ex.type} (${ex.intensity})` });
  }

  if (day.hasJournal) {
    const sleepBucket = bucketScore(day.journal.sleep);
    if (sleepBucket) factors.push({ category: 'sleep', key: `sleep:${sleepBucket}`, label: `${capitalize(sleepBucket)} sleep` });

    const stressBucket = bucketNegativeScore(day.journal.stress);
    if (stressBucket) factors.push({ category: 'stress', key: `stress:${stressBucket}`, label: `${capitalize(stressBucket)} stress` });

    const energyBucket = bucketScore(day.journal.energy);
    if (energyBucket) factors.push({ category: 'energy', key: `energy:${energyBucket}`, label: `${capitalize(energyBucket)} energy` });

    const moodBucket = bucketScore(day.journal.mood);
    if (moodBucket) factors.push({ category: 'mood', key: `mood:${moodBucket}`, label: `${capitalize(moodBucket)} mood` });

    const painBucket = bucketNegativeScore(day.journal.pain);
    if (painBucket) factors.push({ category: 'pain', key: `pain:${painBucket}`, label: `${capitalize(painBucket)} pain` });
  }

  if (day.hasLateMeal) factors.push({ category: 'timing', key: 'timing:late_meal', label: 'Late meal' });

  return factors;
}

export function extractOutcomesFromDay(day: DayComposite): Outcome[] {
  const outcomes: Outcome[] = [];

  for (const s of day.symptoms) {
    outcomes.push({ type: 'symptom_occurrence', key: `symptom:${s.name.toLowerCase()}`, label: s.name });
    if (s.severity >= 7) {
      outcomes.push({ type: 'symptom_severity', key: `symptom_severe:${s.name.toLowerCase()}`, label: `Severe ${s.name}` });
    }
  }

  if (day.isFlareDay) {
    outcomes.push({ type: 'flare_day', key: 'flare_day', label: 'Flare day' });
  }

  return outcomes;
}

export function analyzeSingleFactors(days: DayComposite[]): SingleFactorResult[] {
  const totalDays = days.length;
  if (totalDays < MIN_OCCURRENCES) return [];

  const factorDays = new Map<string, { factor: Factor; dayIndices: Set<number> }>();
  const outcomeDays = new Map<string, { outcome: Outcome; dayIndices: Set<number> }>();

  for (let i = 0; i < days.length; i++) {
    for (const factor of extractFactorsFromDay(days[i])) {
      if (!factorDays.has(factor.key)) {
        factorDays.set(factor.key, { factor, dayIndices: new Set() });
      }
      factorDays.get(factor.key)!.dayIndices.add(i);
    }

    for (const outcome of extractOutcomesFromDay(days[i])) {
      if (!outcomeDays.has(outcome.key)) {
        outcomeDays.set(outcome.key, { outcome, dayIndices: new Set() });
      }
      outcomeDays.get(outcome.key)!.dayIndices.add(i);
    }
  }

  const results: SingleFactorResult[] = [];

  for (const [, { factor }] of factorDays) {
    const fDays = factorDays.get(factor.key)!.dayIndices;

    // Skip factors that appear too frequently — they're constants, not variables
    const factorFrequency = fDays.size / totalDays;
    if (factorFrequency > MAX_FACTOR_FREQUENCY) continue;

    // Need enough "without" days to establish a meaningful base rate
    const withoutFactor = totalDays - fDays.size;
    if (withoutFactor < MIN_WITHOUT_DAYS) continue;

    for (const [, { outcome }] of outcomeDays) {
      if (isSameCategory(factor, outcome)) continue;

      const oDays = outcomeDays.get(outcome.key)!.dayIndices;
      const coOccurrence = intersection(fDays, oDays).size;

      if (coOccurrence < MIN_OCCURRENCES) continue;

      const conditionalRate = coOccurrence / fDays.size;
      const outcomeWithoutFactor = oDays.size - coOccurrence;
      const baseRate = withoutFactor > 0 ? outcomeWithoutFactor / withoutFactor : 0;
      const rateMultiplier = Math.min(
        baseRate > 0 ? conditionalRate / baseRate : conditionalRate > 0 ? MAX_RATE_MULTIPLIER : 0,
        MAX_RATE_MULTIPLIER,
      );

      if (rateMultiplier <= 1.2) continue; // Require at least 20% increase, not just any increase

      const lastCoDay = Math.max(...[...intersection(fDays, oDays)]);
      const recencyDays = days.length - 1 - lastCoDay;

      const impactScore = computeImpact(rateMultiplier, coOccurrence, recencyDays);
      const isHelper = factor.category === 'supplement' || factor.category === 'exercise';

      results.push({
        factor,
        outcome,
        frequency: coOccurrence,
        totalOpportunities: fDays.size,
        baseRate,
        conditionalRate,
        rateMultiplier,
        recencyDays,
        impactScore,
        description: formatDescription(factor, outcome, rateMultiplier, coOccurrence, isHelper),
      });
    }
  }

  return results.sort((a, b) => b.impactScore - a.impactScore);
}

function isSameCategory(factor: Factor, outcome: Outcome): boolean {
  if (factor.category === 'pain' && outcome.type === 'next_day_pain') return true;
  if (factor.category === 'sleep' && outcome.type === 'next_day_sleep') return true;
  if (factor.category === 'energy' && outcome.type === 'next_day_energy') return true;
  return false;
}

function intersection(a: Set<number>, b: Set<number>): Set<number> {
  const result = new Set<number>();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
}

function computeImpact(rateMultiplier: number, frequency: number, recencyDays: number): number {
  const multiplierScore = Math.min(rateMultiplier / 5, 1) * 0.5;
  const frequencyScore = Math.min(frequency / 15, 1) * 0.3;
  const recencyScore = Math.max(0, 1 - recencyDays / 90) * 0.2;
  return multiplierScore + frequencyScore + recencyScore;
}

function formatDescription(factor: Factor, outcome: Outcome, _multiplier: number, _count: number, isHelper: boolean): string {
  if (isHelper) {
    return `${outcome.label} was consistently better on days with ${factor.label.toLowerCase()}.`;
  }
  return `${outcome.label} appeared on days you had ${factor.label.toLowerCase()}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
