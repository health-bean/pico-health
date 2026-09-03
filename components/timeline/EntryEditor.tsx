"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FoodSearchInput } from "@/components/quick-log/FoodSearchInput";
import { MEAL_TYPES } from "@/types/capture";
import type { Food, EntryType } from "@/types";

export type EntryPatch = {
  foodId?: string | null;
  name?: string;
  mealType?: string;
  entryTime?: string;
  severity?: number;
};

export type EntryEditorMode = "food" | "details";

interface EntryEditorProps {
  mode: EntryEditorMode;
  entryType: EntryType;
  name: string;
  mealType?: string | null;
  entryTime?: string | null;
  severity?: number | null;
  protocolId?: string;
  /** Resolves true when the server accepted the change. */
  onPatch: (patch: EntryPatch) => Promise<boolean>;
  onClose: () => void;
}

const SEVERITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function mealLabel(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

/**
 * Inline editor rendered inside a timeline card, below the entry content.
 * "food" swaps the linked food via search; "details" corrects meal, time,
 * and (for symptoms) severity. Every change saves immediately; the card
 * updates in place and the editor stays open for a second correction.
 */
export function EntryEditor({
  mode,
  entryType,
  name,
  mealType,
  entryTime,
  severity,
  protocolId,
  onPatch,
  onClose,
}: EntryEditorProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save(key: string, patch: EntryPatch) {
    setSaving(key);
    const ok = await onPatch(patch);
    setSaving(null);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }
    return ok;
  }

  const chip = (active: boolean) =>
    cn(
      "min-h-9 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-500",
      active ? "bg-teal-100 text-teal-700" : "bg-warm-100 text-warm-600 hover:bg-teal-50"
    );

  return (
    <div className="border-t border-warm-200 px-4 py-3 animate-fade-in-up">
      {mode === "food" ? (
        <FoodSearchInput
          autoFocus
          protocolId={protocolId}
          placeholder={`Replace "${name}"…`}
          onSelect={async (food: Food) => {
            const ok = await save("food", { foodId: food.id, name: food.displayName });
            if (ok) onClose();
          }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {entryType === "food" && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Meal">
              {MEAL_TYPES.map((meal) => (
                <button
                  key={meal}
                  type="button"
                  onClick={() => void save("meal", { mealType: meal })}
                  aria-pressed={mealType === meal}
                  className={chip(mealType === meal)}
                >
                  {mealLabel(meal)}
                </button>
              ))}
            </div>
          )}

          {entryType === "symptom" && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Severity">
              <span className="mr-1 text-xs text-warm-500">Severity</span>
              {SEVERITIES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void save("severity", { severity: n })}
                  aria-pressed={severity === n}
                  className={cn(chip(severity === n), "min-w-9 px-0")}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-warm-500">
            Time
            <input
              type="time"
              defaultValue={(entryTime ?? "").slice(0, 5)}
              onChange={(e) => {
                if (e.target.value) void save("time", { entryTime: e.target.value });
              }}
              className="min-h-9 rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-xs text-warm-700"
            />
          </label>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-warm-500" aria-live="polite">
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving…
            </>
          ) : savedFlash ? (
            <>
              <Check className="h-3 w-3 text-teal-600" aria-hidden /> Saved
            </>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-lg px-3 text-xs font-medium text-teal-700 hover:bg-teal-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
