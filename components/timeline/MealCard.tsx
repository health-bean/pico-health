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
 * One card per meal: the meal and its time on top, each food a row below
 * with its own menu. Foods are grouped by lib/timeline/group-meals.
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
    <section
      aria-label={clock ? `${label}, ${clock}` : label}
      className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)]"
    >
      <header className="flex items-center gap-2 px-4 pt-3 pb-0.5">
        <Utensils className="h-4 w-4 text-teal-600" aria-hidden="true" />
        <h3 className="text-base font-semibold text-warm-900">{label}</h3>
        {clock && <span className="text-xs text-[var(--color-text-muted)]">{clock}</span>}
        {tags.length > 0 && <span className="text-xs text-teal-700">· {tags.join(" · ")}</span>}
      </header>
      <ul>{children}</ul>
    </section>
  );
}
