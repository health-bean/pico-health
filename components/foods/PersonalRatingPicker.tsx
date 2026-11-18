"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FitSymbol } from "@/components/foods/FitSymbol";
import { FIT_TONE_CLASS, type FitTone, type PersonalRating, type PersonalStatus } from "@/lib/protocols/fit-line";

/** Each choice, once chosen, wears its tone: the same teal / ochre / brick as the Log and My food list. */
const OPTIONS: { value: PersonalStatus; label: string; tone: FitTone }[] = [
  { value: "safe", label: "Fine for me", tone: "allowed" },
  { value: "sensitive", label: "Small amounts", tone: "limit" },
  { value: "unsafe", label: "Not for me", tone: "avoid" },
];

/** Same compact chip as the Log's symptom buttons: a 36px face inside a 44px target. */
const chipButton = "group inline-flex min-h-11 items-center focus-visible:outline-none disabled:opacity-60";
const chip =
  "inline-flex h-9 items-center rounded-sm border px-2.5 text-sm font-medium transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-teal-500";
const chipOff = "border-[var(--color-border)] bg-[var(--color-surface-card)] text-warm-900 group-hover:border-teal-300";

/**
 * The person's own verdict on a food, kept apart from what the food contains.
 * Optional and never asked for: tapping the chosen option again clears it.
 */
export function PersonalRatingPicker({
  foodId,
  value,
  onChange,
  layout = "chips",
  foodName,
}: {
  foodId: string;
  value: PersonalRating | null;
  onChange: (next: PersonalRating | null) => void;
  /** "segmented": three equal buttons with ✓ − ✕ and a line saying what the answer does (the food panel). */
  layout?: "chips" | "segmented";
  foodName?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function choose(status: PersonalStatus) {
    const clearing = value?.status === status;
    const previous = value;
    const next: PersonalRating | null = clearing ? null : { status, source: "self" };
    onChange(next);
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/foods/personal-rating", {
        method: clearing ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clearing ? { foodId } : { foodId, status }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      onChange(previous);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (layout === "segmented") {
    return (
      <div className="flex flex-col">
        <div role="group" aria-label="How is this food for you?" className="grid grid-cols-3 gap-1.5">
          {OPTIONS.map((o) => {
            const on = value?.status === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={saving}
                aria-pressed={on}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-[13px] font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:opacity-60",
                  on ? FIT_TONE_CLASS[o.tone].chip : "border-[var(--color-border)] bg-[var(--color-surface-card)] text-warm-900 hover:border-teal-300"
                )}
              >
                <FitSymbol tone={o.tone} className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{o.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-snug text-[var(--color-text-muted)]">
          {value?.source === "trial"
            ? "Set by your reintroduction trial. Tap another option to change it."
            : `Your answer replaces the protocol's for ${foodName ? foodName.toLowerCase() : "this food"}, here and in My food list.`}
        </p>
        {error && <p className="mt-1 text-sm text-brick-600">Couldn&apos;t save that. Try again.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-warm-900">How is this food for you?</span>
      <div role="group" aria-label="How is this food for you?" className="flex flex-wrap gap-x-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={saving}
            aria-pressed={value?.status === o.value}
            onClick={() => choose(o.value)}
            className={chipButton}
          >
            <span className={cn(chip, value?.status === o.value ? FIT_TONE_CLASS[o.tone].chip : chipOff)}>{o.label}</span>
          </button>
        ))}
      </div>
      {value?.source === "trial" && (
        <p className="text-sm text-warm-500">Set by your reintroduction trial. Tap another option to change it.</p>
      )}
      {error && <p className="text-sm text-brick-600">Couldn&apos;t save that. Try again.</p>}
    </div>
  );
}
