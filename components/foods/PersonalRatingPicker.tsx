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

const chip = "min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-60";
const chipOff = "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50";

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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-warm-700">How is this food for you?</span>
      <div role="group" aria-label="How is this food for you?" className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={saving}
            aria-pressed={value?.status === o.value}
            onClick={() => choose(o.value)}
            className={cn(chip, value?.status === o.value ? FIT_TONE_CLASS[o.tone].chip : chipOff)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value?.source === "trial" && (
        <p className="text-sm text-warm-500">Set by your reintroduction trial. Tap another option to change it.</p>
      )}
      {error && <p className="text-sm text-[var(--color-warning-strong)]">Couldn&apos;t save that. Try again.</p>}
    </div>
  );
}
