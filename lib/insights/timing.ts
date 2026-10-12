import type { DayComposite, SingleFactorResult } from './types';
import { computeConfidence } from './single-factor';

/**
 * Meal-level timing. The day-level engine knows tomatoes and hives were on
 * the same Tuesday; it cannot see that the hives came forty minutes after
 * lunch. For acute reactions that ordering is the strongest evidence there
 * is, and it lets an obvious reaction show after a handful of meals instead
 * of a month of days.
 *
 * The unit is a meal: the foods logged at one time on one day. For each
 * food and symptom, compare how often the symptom was logged within
 * WINDOW_HOURS after meals that had the food, against after meals that
 * did not.
 *
 * Capture stamps entries with the time they were logged unless a time is
 * stated, so someone who logs a whole day at 9pm gets one timestamp for
 * everything. Only a symptom strictly after a meal counts, so a batch logged
 * together never looks like a reaction; that person simply gets no timing
 * rows, and the day-level analysis is unchanged.
 */

const WINDOW_HOURS = 4;
/** Meals with the food, and reactions after them, before a row can show. */
const MIN_MEALS = 3;
const MIN_REACTIONS = 3;
/**
 * Slightly stricter than the day-level bar (0.01): there are many more meals
 * than days, so more chances for a coincidence. Measured with
 * `npm run eval:insights-noise`: at 0.01 timing added a median of 1 noise
 * row at 90 days; at 0.003 none, while an obvious reaction to a food eaten
 * every third day still shows 70% of the time at two weeks and every time
 * by three.
 */
const MAX_P = 0.003;
const MIN_RATIO = 2;
/** Without enough other timed meals there is no baseline to compare to. */
const MIN_OTHER_MEALS = 10;

interface Meal {
  day: number;
  minutes: number;
  foods: Map<string, string>; // key → label
}

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function analyzeTiming(days: DayComposite[]): SingleFactorResult[] {
  const meals: Meal[] = [];
  // symptom key → label, and per day the minutes each symptom was logged
  const symptomLabels = new Map<string, string>();
  const symptomTimes: Array<Map<string, number[]>> = [];

  days.forEach((d, day) => {
    const byTime = new Map<number, Meal>();
    for (const f of d.foods) {
      const minutes = toMinutes(f.time);
      if (minutes === null) continue;
      const meal = byTime.get(minutes) ?? { day, minutes, foods: new Map() };
      meal.foods.set(`food:${f.name.toLowerCase()}`, f.name);
      byTime.set(minutes, meal);
    }
    meals.push(...byTime.values());

    const times = new Map<string, number[]>();
    for (const s of d.symptoms) {
      const minutes = toMinutes(s.time);
      if (minutes === null) continue;
      const key = `symptom:${s.name.trim().toLowerCase()}`;
      symptomLabels.set(key, s.name);
      times.set(key, [...(times.get(key) ?? []), minutes]);
    }
    symptomTimes.push(times);
  });

  if (meals.length < MIN_MEALS + MIN_OTHER_MEALS) return [];

  const followed = (meal: Meal, symptomKey: string) =>
    (symptomTimes[meal.day].get(symptomKey) ?? []).some(t => t > meal.minutes && t - meal.minutes <= WINDOW_HOURS * 60);

  const foodLabels = new Map<string, string>();
  for (const m of meals) for (const [k, l] of m.foods) foodLabels.set(k, l);

  const results: SingleFactorResult[] = [];
  const N = meals.length;
  const lf = logFactorials(N);

  for (const [symptomKey, symptomLabel] of symptomLabels) {
    const hit = meals.map(m => followed(m, symptomKey));
    const K = hit.filter(Boolean).length;
    if (K < MIN_REACTIONS) continue;

    for (const [foodKey, foodLabel] of foodLabels) {
      let n = 0, k = 0;
      meals.forEach((m, i) => { if (m.foods.has(foodKey)) { n++; if (hit[i]) k++; } });
      const others = N - n;
      if (n < MIN_MEALS || k < MIN_REACTIONS || others < MIN_OTHER_MEALS) continue;

      const rate = k / n;
      const baseRate = (K - k) / others;
      const ratio = (k + 0.5) / (n + 1) / ((K - k + 0.5) / (others + 1));
      if (ratio < MIN_RATIO) continue;

      const p = hypergeomUpper(k, N, K, n, lf);
      if (p >= MAX_P) continue;

      const lastDay = Math.max(...meals.filter((m, i) => m.foods.has(foodKey) && hit[i]).map(m => m.day));
      // A timed reaction is sharper evidence than a shared day, so a
      // reaction that clears the bar is never less than moderate.
      const confidence = computeConfidence(Math.min(ratio, 5), k) === 'strong' ? 'strong' : 'moderate';

      results.push({
        factor: { category: 'food', key: foodKey, label: foodLabel },
        outcome: { type: 'symptom_occurrence', key: symptomKey, label: symptomLabel },
        frequency: k,
        totalOpportunities: n,
        baseRate,
        conditionalRate: rate,
        rateMultiplier: Math.min(ratio, 5),
        recencyDays: days.length - 1 - lastDay,
        impactScore: timingImpact(ratio, k, days.length - 1 - lastDay),
        direction: 'increases',
        confidence,
        basis: 'meals',
        description: `${symptomLabel} came within ${WINDOW_HOURS} hours of ${foodLabel.toLowerCase()} ${k} of ${n} times. After other meals, ${Math.round(baseRate * 100)}%.`,
      });
    }
  }

  return results.sort((a, b) => b.impactScore - a.impactScore);
}

/** Ranked on the same scale as day-level rows, with a small lift for the sharper evidence. */
function timingImpact(ratio: number, reactions: number, recencyDays: number): number {
  const effect = Math.min((Math.min(ratio, 5) - 1) / 2, 1) * 0.35;
  const evidence = Math.min(Math.log2(reactions + 1) / Math.log2(21), 1) * 0.45;
  const recency = Math.max(0, 1 - recencyDays / 90) * 0.2;
  return Math.min(1, effect + evidence + recency + 0.05);
}

function logFactorials(n: number): number[] {
  const out = [0];
  for (let i = 1; i <= n; i++) out.push(out[i - 1] + Math.log(i));
  return out;
}

/** One-sided Fisher exact: chance of at least `k` reactions among `n` meals, if the food were unrelated. */
function hypergeomUpper(k: number, N: number, K: number, n: number, lf: number[]): number {
  const logC = (a: number, b: number) => lf[a] - lf[b] - lf[a - b];
  let p = 0;
  for (let i = k; i <= Math.min(K, n); i++) p += Math.exp(logC(K, i) + logC(N - K, n - i) - logC(N, n));
  return Math.min(1, p);
}
