import { assembleInsights } from './assemble';
import { isFlareDay } from './day-composite';
import type { DayComposite, FoodEntry, InsightsOutput, SymptomEntry } from './types';

/**
 * The noise check. Generates logs in which every symptom is statistically
 * independent of everything the person ate, took or did, then runs the real
 * engine over them. Anything the engine reports is therefore a false
 * positive by construction, and "what would the page show" is a direct
 * measure of how much of Insights is noise.
 *
 * With zero real users this is the only way to answer that question. Re-run
 * it (`npm run eval:insights-noise`) whenever a gate or threshold changes.
 */

export interface NullSimOptions {
  /** Logged days in the window. */
  days: number;
  seed: number;
  foodsPerDay?: number;
  /** Share of days with a Reflect journal entry. */
  journalRate?: number;
  /** Real effects to plant, for checking that a gate keeps what it should. */
  plant?: PlantedEffect[];
  /** Symptoms carry the time they were logged (default). False models someone who never logs times. */
  timed?: boolean;
}

/** On days with `cause` (a food or supplement), `symptom` is `multiplier`× as likely. */
export interface PlantedEffect {
  cause: string;
  symptom: string;
  multiplier: number;
  /** The symptom is logged 15 minutes to 3 hours after the meal with the cause, rather than at a random time. */
  acute?: boolean;
}

/** What the Insights page would render with the default filters. */
export interface NoiseCount {
  /** Non-early trigger rows, singles and combinations. */
  triggersShown: number;
  combinationsShown: number;
  /** Meal-timing rows (timing.ts). */
  timedShown: number;
  /** Property groups (one row per property on the page). */
  propertyRowsShown: number;
  helpersShown: number;
  /** Everything on the page by default. */
  rowsShown: number;
  /** Rows labelled strong. */
  strong: number;
  /** Everything the engine returned, early signals included. */
  rawFindings: number;
}

/** mulberry32: small, fast, and the same sequence on every machine. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A realistic pantry: some foods eaten most days, most occasionally, several
// carrying the trigger properties the catalog attaches. Popularity is skewed
// the way real logs are (a few staples, a long tail).
const PANTRY: Array<{ name: string; weight: number; props?: Array<[string, string]> }> = [
  { name: 'Oatmeal', weight: 8 }, { name: 'Eggs', weight: 7 }, { name: 'Coffee', weight: 9, props: [['histamine', 'moderate']] },
  { name: 'Rice', weight: 6 }, { name: 'Chicken', weight: 6 }, { name: 'Salmon', weight: 3, props: [['histamine', 'moderate']] },
  { name: 'Spinach', weight: 3, props: [['oxalate', 'very_high'], ['histamine', 'high']] },
  { name: 'Tomatoes', weight: 4, props: [['histamine', 'high'], ['nightshade', 'high']] },
  { name: 'Aged cheese', weight: 2, props: [['histamine', 'very_high'], ['tyramine', 'high']] },
  { name: 'Avocado', weight: 3, props: [['histamine', 'high']] }, { name: 'Banana', weight: 4, props: [['amines', 'moderate']] },
  { name: 'Blueberries', weight: 4 }, { name: 'Broccoli', weight: 3, props: [['fodmap', 'moderate']] },
  { name: 'Garlic', weight: 3, props: [['fodmap', 'high']] }, { name: 'Onion', weight: 3, props: [['fodmap', 'high']] },
  { name: 'Wheat bread', weight: 4, props: [['gluten', 'high'], ['fodmap', 'moderate']] },
  { name: 'Almonds', weight: 2, props: [['oxalate', 'high']] }, { name: 'Sweet potato', weight: 2, props: [['oxalate', 'moderate']] },
  { name: 'Ground turkey', weight: 2 }, { name: 'Bell pepper', weight: 2, props: [['nightshade', 'high']] },
  { name: 'Yogurt', weight: 3, props: [['histamine', 'high']] }, { name: 'Apple', weight: 3, props: [['fodmap', 'high']] },
  { name: 'Dark chocolate', weight: 2, props: [['histamine', 'high'], ['oxalate', 'high']] },
  { name: 'Lentils', weight: 1, props: [['fodmap', 'high'], ['lectin', 'high']] }, { name: 'Olive oil', weight: 5 },
  { name: 'Kombucha', weight: 1, props: [['histamine', 'very_high']] }, { name: 'Wine', weight: 1, props: [['histamine', 'very_high'], ['tyramine', 'high']] },
  { name: 'Quinoa', weight: 2 }, { name: 'Carrots', weight: 3 }, { name: 'Zucchini', weight: 2 },
];
const SUPPLEMENTS = ['Magnesium', 'Turmeric', 'Vitamin D', 'Quercetin', 'Probiotic'];
// Each symptom has its own base rate, but none depends on anything else.
const SYMPTOMS: Array<[string, number]> = [
  ['Headache', 0.25], ['Bloating', 0.3], ['Fatigue', 0.35], ['Joint pain', 0.2],
  ['Brain fog', 0.2], ['Nausea', 0.1], ['Hives', 0.08], ['Migraine', 0.1],
];

function pickWeighted<T extends { weight: number }>(r: () => number, items: T[]): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let x = r() * total;
  for (const it of items) { x -= it.weight; if (x <= 0) return it; }
  return items[items.length - 1];
}

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

export function generateNullDays({ days, seed, foodsPerDay = 5, journalRate = 0.8, plant = [], timed = true }: NullSimOptions): DayComposite[] {
  const r = rng(seed);
  const out: DayComposite[] = [];
  const start = Date.UTC(2026, 0, 1);
  const cycleOffset = int(r, 0, 27);

  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);

    const names = new Set<string>();
    const foods: FoodEntry[] = [];
    while (names.size < foodsPerDay) {
      const f = pickWeighted(r, PANTRY);
      if (names.has(f.name)) continue;
      names.add(f.name);
      foods.push({
        foodId: null, name: f.name, mealType: null, protocolStatus: null,
        time: `${int(r, 7, 21)}:00`,
        properties: (f.props ?? []).map(([property, severity]) => ({ property, severity })),
        ...(r() < 0.08 ? { preparation: ['leftover'] } : {}),
      });
    }

    const supplements = SUPPLEMENTS.filter(() => r() < 0.4).map(name => ({ name, time: null }));
    const had = new Set([...names, ...supplements.map(s => s.name)]);

    const symptoms: SymptomEntry[] = [];
    const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    for (const [name, base] of SYMPTOMS) {
      let p = base;
      let acuteAfter: number | null = null;
      for (const e of plant) {
        if (e.symptom !== name || !had.has(e.cause)) continue;
        p *= e.multiplier;
        const meal = foods.find(f => f.name === e.cause);
        if (e.acute && meal?.time) acuteAfter = parseInt(meal.time, 10) * 60;
      }
      if (r() < Math.min(p, 0.95)) {
        // Logged as it happens: at a random waking minute, or shortly after
        // the meal for a planted acute reaction.
        const minute = acuteAfter !== null ? Math.min(acuteAfter + int(r, 15, 180), 23 * 60 + 59) : int(r, 7 * 60, 23 * 60);
        symptoms.push({ name, severity: int(r, 2, 8), time: timed ? hhmm(minute) : null });
      }
    }

    const hasJournal = r() < journalRate;
    const score = () => (hasJournal ? int(r, 1, 10) : null);

    out.push({
      userId: 'null-sim', date,
      foods, symptoms, supplements, medications: [], exposures: [], exercises: [],
      journal: {
        sleep: score(), energy: score(), mood: score(), stress: score(), pain: score(),
        cycleDay: hasJournal ? ((i + cycleOffset) % 28) + 1 : null,
        meditationPractice: hasJournal ? r() < 0.3 : null,
        bedtime: hasJournal ? `${int(r, 21, 24) % 24}:00` : null,
      },
      foodCount: foods.length, symptomCount: symptoms.length, supplementCount: supplements.length,
      medicationCount: 0, exposureCount: 0, exerciseCount: 0,
      protocolId: null, compliancePct: null, violationCount: 0,
      entryCount: foods.length + symptoms.length + supplements.length,
      hasJournal,
      isFlareDay: isFlareDay(symptoms),
      hasLateMeal: foods.some(f => parseInt(f.time!, 10) >= 20),
    });
  }
  return out;
}

/** Applies the same default filters as `app/(app)/insights/page.tsx`. */
export function countShown(output: InsightsOutput): NoiseCount {
  const shown = <T extends { confidence: string }>(rows: T[]) => rows.filter(r => r.confidence !== 'early');
  const triggers = shown(output.triggers);
  const helpers = shown(output.helpers);
  const propertyRowsShown = new Set(output.propertyPatterns.map(p => p.property)).size;
  const combinationsShown = triggers.filter(t => 'factorCount' in t).length;
  return {
    triggersShown: triggers.length,
    combinationsShown,
    timedShown: triggers.filter(t => 'basis' in t && t.basis === 'meals').length,
    propertyRowsShown,
    helpersShown: helpers.length,
    rowsShown: triggers.length + propertyRowsShown + helpers.length,
    strong: [...triggers, ...helpers].filter(r => r.confidence === 'strong').length,
    rawFindings: output.triggers.length + output.helpers.length + output.propertyPatterns.length,
  };
}

export function runNullSim(opts: NullSimOptions): NoiseCount {
  const days = generateNullDays(opts);
  return countShown(assembleInsights(days, days[days.length - 1].date, opts.days));
}

/** Summary over many seeds: the median is what a typical user sees, the max is a bad week. */
export function summarize(days: number, seeds: number): Record<keyof NoiseCount, { median: number; max: number }> {
  const runs = Array.from({ length: seeds }, (_, s) => runNullSim({ days, seed: s + 1 }));
  const keys = Object.keys(runs[0]) as Array<keyof NoiseCount>;
  const out = {} as Record<keyof NoiseCount, { median: number; max: number }>;
  for (const k of keys) {
    const v = runs.map(r => r[k]).sort((a, b) => a - b);
    out[k] = { median: v[Math.floor(v.length / 2)], max: v[v.length - 1] };
  }
  return out;
}

/**
 * Real effects the engine should find, sized like the ones people report:
 * a strong food trigger, a modest one, and a supplement that halves a
 * symptom. `recall` is the share of seeds in which each is shown by default.
 */
export const PLANTED: PlantedEffect[] = [
  { cause: 'Tomatoes', symptom: 'Joint pain', multiplier: 2.5 },
  { cause: 'Aged cheese', symptom: 'Migraine', multiplier: 3 },
  { cause: 'Wheat bread', symptom: 'Bloating', multiplier: 1.6 },
  { cause: 'Magnesium', symptom: 'Headache', multiplier: 0.4 },
];

export function plantedRecall(days: number, seeds: number): Array<{ effect: PlantedEffect; recall: number }> {
  const hits = PLANTED.map(() => 0);
  for (let s = 1; s <= seeds; s++) {
    const d = generateNullDays({ days, seed: 1000 + s, plant: PLANTED });
    const out = assembleInsights(d, d[d.length - 1].date, days);
    const shown = [...out.triggers, ...out.helpers].filter(r => r.confidence !== 'early');
    PLANTED.forEach((e, i) => {
      const found = shown.some(r => {
        const factors = 'factors' in r ? r.factors : [r.factor];
        return r.outcome.label === e.symptom && factors.some(f => f.label === e.cause);
      });
      if (found) hits[i]++;
    });
  }
  return PLANTED.map((effect, i) => ({ effect, recall: hits[i] / seeds }));
}

/**
 * An obvious acute reaction: hives within three hours of a food, logged as
 * it happens. Returns the share of seeds in which it is shown by default,
 * per window, to answer "how soon does something obvious show up".
 */
export function acuteRecall(cause: string, multiplier: number, windows: number[], seeds: number): number[] {
  return windows.map(days => {
    let hits = 0;
    for (let s = 1; s <= seeds; s++) {
      const d = generateNullDays({ days, seed: 5000 + s, plant: [{ cause, symptom: 'Hives', multiplier, acute: true }] });
      const out = assembleInsights(d, d[d.length - 1].date, days);
      if (out.triggers.some(r => r.confidence !== 'early' && r.outcome.label === 'Hives' && ('factors' in r ? r.factors : [r.factor]).some(f => f.label === cause))) hits++;
    }
    return hits / seeds;
  });
}
