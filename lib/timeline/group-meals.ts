/**
 * How the Log lays out a day: foods eaten together become one meal card,
 * everything else stays a row of its own. Pure, so it can be tested.
 *
 * Entries arrive newest first (the API orders by time, descending). A food
 * joins the meal above it when nothing else was logged in between, the meal
 * type matches, and it is within MEAL_WINDOW_MIN of that meal. A symptom
 * logged mid-meal therefore splits it, which keeps "what came before the
 * symptom" readable on the page.
 */

import { PROPERTY_LABELS } from "@/components/foods/FoodPropertyTag";

/** Foods logged up to an hour apart under the same meal type are one meal. */
export const MEAL_WINDOW_MIN = 60;

interface Groupable {
  entryType: string;
  mealType?: string | null;
  entryTime: string | null;
}

export type DayItem<T extends Groupable> =
  | { kind: "meal"; mealType: string | null; time: string | null; entries: T[] }
  | { kind: "entry"; entry: T };

function minutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isNaN(h) ? null : h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** The meal being built: its type and its newest food's time, which bounds its span. */
type OpenMeal = { mealType: string | null; latest: string | null };

function sameMeal(meal: OpenMeal, e: Groupable): boolean {
  if ((meal.mealType ?? null) !== (e.mealType ?? null)) return false;
  const a = minutes(meal.latest);
  const b = minutes(e.entryTime);
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= MEAL_WINDOW_MIN;
}

export function groupMeals<T extends Groupable>(entries: T[]): DayItem<T>[] {
  const out: DayItem<T>[] = [];
  let open: OpenMeal | null = null;

  for (const e of entries) {
    const last = out[out.length - 1];
    if (e.entryType === "food" && open && last?.kind === "meal" && sameMeal(open, e)) {
      last.entries.push(e);
      // A meal is shown at the time its first food was logged. HH:MM:SS compares as text.
      if (e.entryTime && (!last.time || e.entryTime < last.time)) last.time = e.entryTime;
      continue;
    }
    if (e.entryType === "food") {
      out.push({ kind: "meal", mealType: e.mealType ?? null, time: e.entryTime, entries: [e] });
      open = { mealType: e.mealType ?? null, latest: e.entryTime };
      continue;
    }
    out.push({ kind: "entry", entry: e });
    open = null;
  }
  return out;
}

const LEVEL_WORD: Record<string, { word: string; rank: number }> = {
  very_high: { word: "Very high", rank: 3 },
  high: { word: "High", rank: 2 },
  moderate: { word: "Moderate", rank: 1 },
};

export interface NotableProperty {
  key: string;
  label: string;
  /** "moderate" | "high" | "very_high", or "flag" for a true boolean (e.g. nightshade). */
  level: "moderate" | "high" | "very_high" | "flag";
}

/**
 * Trigger properties worth a line on the Log: moderate and above, plus true
 * flags such as nightshade, strongest first. The rest sit behind the row's
 * details.
 */
export function notableProperties(
  properties: Record<string, unknown> | null | undefined,
  limit = 3
): NotableProperty[] {
  if (!properties) return [];
  const out: (NotableProperty & { rank: number })[] = [];
  for (const [key, value] of Object.entries(properties)) {
    const base = PROPERTY_LABELS[key];
    if (!base) continue;
    if (value === true) {
      out.push({ key, label: base, level: "flag", rank: 2.5 });
    } else if (typeof value === "string" && LEVEL_WORD[value]) {
      const lv = LEVEL_WORD[value];
      const noun = base === "FODMAP" ? base : base.toLowerCase();
      out.push({ key, label: `${lv.word} ${noun}`, level: value as NotableProperty["level"], rank: lv.rank });
    }
  }
  return out
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ key, label, level }) => ({ key, label, level }));
}
