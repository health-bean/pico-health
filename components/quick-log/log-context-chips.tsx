"use client";

import { Coffee, Sun, Moon, Cookie, Clock } from "lucide-react";
import type { MealType, QuickLogWhen, WhenMode } from "@/hooks/use-quick-log";

const chipBase =
  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors";
const chipOn = "border-teal-300 bg-teal-50 text-teal-700";
const chipOff =
  "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50";

const MEALS: { id: MealType; label: string; icon: typeof Coffee }[] = [
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "lunch", label: "Lunch", icon: Sun },
  { id: "dinner", label: "Dinner", icon: Moon },
  { id: "snack", label: "Snack", icon: Cookie },
];

interface MealTypeChipsProps {
  value: MealType | null;
  onChange: (mealType: MealType | null) => void;
}

export function MealTypeChips({ value, onChange }: MealTypeChipsProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-400">
        Meal
      </h3>
      <div
        className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        role="group"
        aria-label="Meal type"
      >
        {MEALS.map((meal) => {
          const Icon = meal.icon;
          const isOn = value === meal.id;
          return (
            <button
              key={meal.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(isOn ? null : meal.id)}
              className={`${chipBase} ${isOn ? chipOn : chipOff}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {meal.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const WHEN: { id: WhenMode; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "earlier", label: "Earlier today" },
  { id: "yesterday", label: "Yesterday" },
];

interface WhenChipsProps {
  value: QuickLogWhen;
  onChange: (when: QuickLogWhen) => void;
}

export function WhenChips({ value, onChange }: WhenChipsProps) {
  const showTime = value.mode !== "now";
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-400">
        When
      </h3>
      <div
        className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        role="group"
        aria-label="When"
      >
        {WHEN.map((w) => {
          const isOn = value.mode === w.id;
          return (
            <button
              key={w.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange({ ...value, mode: w.id })}
              className={`${chipBase} ${isOn ? chipOn : chipOff}`}
            >
              {w.id === "now" && <Clock className="h-3.5 w-3.5" />}
              {w.label}
            </button>
          );
        })}
        {showTime && (
          <input
            type="time"
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
            aria-label="Time"
            className="min-h-9 shrink-0 rounded-full border border-warm-200 bg-[var(--color-surface-card)] px-3 py-1.5 text-sm text-warm-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        )}
      </div>
    </div>
  );
}
