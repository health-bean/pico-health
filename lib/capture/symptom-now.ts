/**
 * Pure logic behind in-the-moment symptom logging on Log: which meal to
 * check in about, what time "started 1 h ago" means, and which symptoms to
 * offer. Timing is what lets a strong reaction show in two to three weeks
 * (lib/insights/timing.ts), and it only works when a symptom carries the
 * time it started.
 */

export interface LoggedEntry {
  entryType: string;
  name: string;
  entryTime: string | null;
  mealType?: string | null;
}

export interface CheckinMeal {
  /** HH:MM:SS of the meal, also the dismissal key. */
  time: string;
  mealType: string | null;
  names: string[];
}

/** Ask between 90 minutes and 4 hours after a meal: the window timing.ts counts reactions in. */
export const CHECKIN_FROM_MIN = 90;
export const CHECKIN_UNTIL_MIN = 240;

/** Mild / moderate / severe on the existing 1–10 scale. Severe lands at 8, so it counts toward a flare day (≥7). */
export const SEVERITY = { mild: 3, moderate: 5, severe: 8 } as const;

export const STARTED_OPTIONS = [
  { label: 'Just now', minutes: 0 },
  { label: '30 min ago', minutes: 30 },
  { label: '1 h ago', minutes: 60 },
  { label: '2 h+ ago', minutes: 120 },
] as const;

/** For people with no symptoms logged yet: the most common ones, as examples to tap. */
const FALLBACK_SYMPTOMS = ['Headache', 'Bloating', 'Fatigue'];

export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isNaN(h) ? null : h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function hhmmss(minutes: number): string {
  const m = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
}

/** The start time for "started N minutes ago", never before midnight of today. */
export function startedAt(now: Date, minutesAgo: number): string {
  return hhmmss(now.getHours() * 60 + now.getMinutes() - minutesAgo);
}

/**
 * The most recent meal that ended 90 minutes to 4 hours ago with nothing
 * logged since, unless it was already answered. Foods logged at the same
 * time are one meal.
 */
export function pickCheckinMeal(entries: LoggedEntry[], now: Date, answered: (time: string) => boolean): CheckinMeal | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const meals = new Map<string, CheckinMeal>();
  for (const e of entries) {
    if ((e.entryType !== 'food' && e.entryType !== 'off_protocol') || !e.entryTime) continue;
    const meal = meals.get(e.entryTime) ?? { time: e.entryTime, mealType: e.mealType ?? null, names: [] };
    if (!meal.names.includes(e.name)) meal.names.push(e.name);
    meals.set(e.entryTime, meal);
  }
  const latest = [...meals.values()].sort((a, b) => toMinutes(b.time)! - toMinutes(a.time)!)[0];
  if (!latest) return null;

  const mealMin = toMinutes(latest.time)!;
  const since = nowMin - mealMin;
  if (since < CHECKIN_FROM_MIN || since > CHECKIN_UNTIL_MIN) return null;
  if (answered(latest.time)) return null;
  const loggedSince = entries.some(e => e.entryType === 'symptom' && (toMinutes(e.entryTime) ?? -1) > mealMin);
  return loggedSince ? null : latest;
}

/** The person's own top three symptoms, topped up with common ones so the row is never empty. */
export function topSymptoms(recent: Array<{ entryType: string; name: string; count: number }>): string[] {
  const own = recent
    .filter(i => i.entryType === 'symptom')
    .sort((a, b) => b.count - a.count)
    .map(i => i.name);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...own, ...FALLBACK_SYMPTOMS]) {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === 3) break;
  }
  return out;
}
