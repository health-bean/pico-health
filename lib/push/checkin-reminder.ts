import { pickCheckinMeal, type CheckinMeal, type LoggedEntry } from "@/lib/capture/symptom-now";
import type { PushMessage } from "./send";

/** No reminders before 8:00 or after 21:30, local time. A check-in is never worth waking someone. */
export const QUIET_UNTIL_MIN = 8 * 60;
export const QUIET_FROM_MIN = 21 * 60 + 30;

/**
 * The person's local date, and a Date whose getHours()/getMinutes() read as
 * their local clock, so the same check-in logic the Log uses can run on a
 * server in UTC.
 */
export function localClock(now: Date, timeZone: string): { date: string; clock: Date } {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value])
    );
  } catch {
    return localClock(now, "UTC");
  }
  const clock = new Date(2000, 0, 1, Number(parts.hour), Number(parts.minute));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, clock };
}

/**
 * The meal to send a reminder about, if any: the same rule as the in-app
 * check-in (90 min to 4 h after the latest meal, nothing logged since, not
 * answered), outside quiet hours, and only once per meal.
 */
export function dueReminder(entries: LoggedEntry[], clock: Date): CheckinMeal | null {
  const minutes = clock.getHours() * 60 + clock.getMinutes();
  if (minutes < QUIET_UNTIL_MIN || minutes > QUIET_FROM_MIN) return null;
  const meal = pickCheckinMeal(entries, clock, () => false);
  if (!meal) return null;
  const alreadySent = entries.some((e) => e.entryTime === meal.time && e.structuredContent?.checkinPushedAt);
  return alreadySent ? null : meal;
}

export function reminderMessage(meal: CheckinMeal): PushMessage {
  const foods = meal.names.slice(0, 3).join(", ") + (meal.names.length > 3 ? "…" : "");
  return {
    title: `How are you since ${meal.mealType ?? "your meal"}?`,
    body: `${foods} at ${meal.time.slice(0, 5)}. Tap to answer.`,
    url: "/log",
  };
}
