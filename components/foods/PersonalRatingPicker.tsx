"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
}: {
  foodId: string;
  value: PersonalRating | null;
  onChange: (next: PersonalRating | null) => void;
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
