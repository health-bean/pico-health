import type { DayComposite, Factor, Outcome, SingleFactorResult, Direction, Confidence } from './types';
import { bucketScore, bucketNegativeScore } from './types';

const MIN_OCCURRENCES = 3;
const MAX_FACTOR_FREQUENCY = 0.70; // Skip factors present on >70% of days — they're constants, not signals
const MIN_WITHOUT_DAYS = 5; // Need at least 5 days WITHOUT the factor for a meaningful base rate
const MAX_RATE_MULTIPLIER = 5; // Cap to avoid huge multipliers from tiny base rates
const MIN_RATE_MULTIPLIER = 1 / MAX_RATE_MULTIPLIER;
/**
 * A trigger needs either 5 supporting days or the outcome on ≥25% of factor
 * days — 4 co-occurrences out of 57 factor days is noise, not a pattern.
 */
const MIN_SUPPORT_DAYS = 5;
const MIN_SUPPORT_SHARE = 0.25;
/** A helper needs the factor and the outcome each seen on ≥5 days to say "less likely with". */
const MIN_HELPER_DAYS = 5;
/** …and the outcome must be common enough to reduce: "nausea 1% vs 4%" is not a finding. */
const MIN_HELPER_BASE_RATE = 0.15;
const TRIGGER_THRESHOLD = 1.2; // ≥20% more likely
const HELPER_THRESHOLD = 0.8; // ≥20% less likely

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

    const eligible = eligibleDirections(factor);
    if (eligible.size === 0) continue;

    for (const [, { outcome }] of outcomeDays) {
      if (isSameCategory(factor, outcome)) continue;

      const oDays = outcomeDays.get(outcome.key)!.dayIndices;
      const coDays = intersection(fDays, oDays);
      const coOccurrence = coDays.size;

      const conditionalRate = coOccurrence / fDays.size;
      const outcomeWithoutFactor = oDays.size - coOccurrence;
      const baseRate = withoutFactor > 0 ? outcomeWithoutFactor / withoutFactor : 0;

      // Laplace-smoothed ratio: a 0% base rate on 8 days must not read as "5× more likely".
      const smoothedWith = (coOccurrence + 0.5) / (fDays.size + 1);
      const smoothedWithout = (outcomeWithoutFactor + 0.5) / (withoutFactor + 1);
      const rateMultiplier = clamp(smoothedWith / smoothedWithout, MIN_RATE_MULTIPLIER, MAX_RATE_MULTIPLIER);

      let direction: Direction;
      if (rateMultiplier >= TRIGGER_THRESHOLD && eligible.has('increases')) {
        if (coOccurrence < MIN_OCCURRENCES) continue;
        if (coOccurrence < MIN_SUPPORT_DAYS && conditionalRate < MIN_SUPPORT_SHARE) continue;
        direction = 'increases';
      } else if (rateMultiplier <= HELPER_THRESHOLD && eligible.has('decreases')) {
        if (fDays.size < MIN_HELPER_DAYS || oDays.size < MIN_HELPER_DAYS) continue;
        if (baseRate < MIN_HELPER_BASE_RATE) continue;
        direction = 'decreases';
      } else {
        continue;
      }

      // Recency: for triggers, the last day both happened; for helpers, the last factor day.
      const recencyBasis = direction === 'increases' ? coDays : fDays;
      const recencyDays = days.length - 1 - Math.max(...[...recencyBasis]);

      // Evidence: supporting days for a trigger; factor days for a helper (few co-occurrences is the point).
      const evidenceDays = direction === 'increases' ? coOccurrence : fDays.size;
      const confidence = computeConfidence(rateMultiplier, evidenceDays);
      const impactScore = computeImpact(rateMultiplier, evidenceDays, recencyDays, confidence);

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
        direction,
        confidence,
        description: formatDescription(factor, outcome, direction, coOccurrence, fDays.size, conditionalRate, baseRate),
      });
    }
  }

  return results.sort((a, b) => b.impactScore - a.impactScore);
}

/**
 * Which directions make sense for a factor. Foods, properties, preparation,
 * dose, additions, medications, exposures and timing can be triggers; foods,
 * supplements and exercise can be helpers. Journal buckets count only in the
 * direction that means something: poor sleep / high stress can be triggers,
 * good sleep / low stress can be helpers, "moderate" anything is noise.
 */
export function eligibleDirections(factor: Factor): Set<Direction> {
  const both = new Set<Direction>(['increases', 'decreases']);
  const inc = new Set<Direction>(['increases']);
  const dec = new Set<Direction>(['decreases']);
  const none = new Set<Direction>();
  switch (factor.category) {
    case 'food':
      return both;
    case 'food_property':
    case 'preparation':
    case 'quantity':
    case 'addition':
    case 'medication':
    case 'exposure':
    case 'timing':
      return inc;
    case 'supplement':
    case 'exercise':
      return dec;
    case 'sleep':
    case 'energy':
    case 'mood':
      if (factor.key.endsWith(':poor')) return inc;
      if (factor.key.endsWith(':good')) return dec;
      return none;
    case 'stress':
    case 'pain':
      if (factor.key.endsWith(':high')) return inc;
      if (factor.key.endsWith(':low')) return dec;
      return none;
    default:
      return none;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Effect size on a 0–1 scale: 3× (or ⅓×) and beyond count as maximal. */
function effectSize(rateMultiplier: number): number {
  const ratio = rateMultiplier >= 1 ? rateMultiplier : 1 / rateMultiplier;
  return Math.min((ratio - 1) / 2, 1);
}

export function computeConfidence(rateMultiplier: number, evidenceDays: number): Confidence {
  const ratio = rateMultiplier >= 1 ? rateMultiplier : 1 / rateMultiplier;
  if (evidenceDays >= 12 && ratio >= 2) return 'strong';
  if (evidenceDays >= 6 && ratio >= 1.5) return 'moderate';
  return 'early';
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

/**
 * Ranking. Evidence outweighs effect size: 33 supporting days at 2× should
 * outrank 4 days at 5×. Log-scaled so 20 days ≈ full marks and diminishing
 * returns beyond. Confidence adds a small step so "strong" always sorts
 * above "early" at similar scores.
 */
function computeImpact(rateMultiplier: number, evidenceDays: number, recencyDays: number, confidence: Confidence): number {
  const effect = effectSize(rateMultiplier) * 0.35;
  const evidence = Math.min(Math.log2(evidenceDays + 1) / Math.log2(21), 1) * 0.45;
  const recency = Math.max(0, 1 - recencyDays / 90) * 0.2;
  const step = confidence === 'strong' ? 0.06 : confidence === 'moderate' ? 0.03 : 0;
  return Math.min(1, effect + evidence + recency + step);
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Every description carries its denominator — the product promises honest counts, not verdicts. */
function formatDescription(
  factor: Factor,
  outcome: Outcome,
  direction: Direction,
  coOccurrence: number,
  factorDays: number,
  conditionalRate: number,
  baseRate: number,
): string {
  const f = factor.label.toLowerCase();
  const o = outcome.label;
  if (direction === 'decreases') {
    return `${o} on ${coOccurrence} of ${factorDays} days with ${f} (${pct(conditionalRate)}), vs ${pct(baseRate)} of days without.`;
  }
  return `${o} on ${coOccurrence} of ${factorDays} days with ${f} (${pct(conditionalRate)}), vs ${pct(baseRate)} of other days.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
