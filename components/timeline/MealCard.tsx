"use client";

import { Utensils } from "lucide-react";
import type { ReactNode } from "react";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function formatClock(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

/**
 * A meal on the day's timeline: its name as a heading and the foods indented
 * under it, each with its own menu. Not a box: nothing on the timeline is,
 * so a meal and a vitamin sit in the same system. Foods are grouped by
 * lib/timeline/group-meals.
 */
export function MealCard({
  mealType,
  time,
  tags = [],
  children,
}: {
  mealType: string | null;
  time: string | null;
  /** Clarifier answers every food in the meal shares ("Leftover"), shown once here. */
  tags?: string[];
  children: ReactNode;
}) {
  const label = (mealType && MEAL_LABELS[mealType]) || "Food";
  const clock = formatClock(time);
  return (
    <section aria-label={clock ? `${label}, ${clock}` : label}>
      <header className="flex min-h-6 items-center gap-2">
        <Utensils className="h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />
        <h3 className="text-[15px] font-semibold text-warm-900">{label}</h3>
        {tags.length > 0 && <span className="text-xs text-[var(--color-text-muted)]">· {tags.join(" · ")}</span>}
      </header>
      <ul className="pl-6">{children}</ul>
    </section>
  );
}
