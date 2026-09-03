"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Clarifier } from "@/lib/clarifiers/types";

interface ClarifierRowProps {
  clarifier: Clarifier;
  /** Called after the server accepted an answer or a skip. */
  onDone: (result: { entryId: string; dimension: string; answer: string[] | "skipped" }) => void;
  /** Tighter spacing for the capture card. */
  compact?: boolean;
}

/** Answers that mean "none of the others" and submit on their own. */
const EXCLUSIVE = new Set(["plain", "neither", "fresh", "usual", "less", "more"]);

/**
 * One clarifier question as a chip row. Single-choice questions save on tap;
 * multi-choice questions toggle chips and save on "Done" (or immediately when
 * an exclusive option like "Plain" is tapped). Never blocks anything else.
 */
export function ClarifierRow({ clarifier, onDone, compact }: ClarifierRowProps) {
  const [picked, setPicked] = useState<string[]>(
    clarifier.suggested ? [clarifier.suggested] : []
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string[] | "skipped" | null>(null);
  const [error, setError] = useState(false);

  async function submit(answer: string[] | "skipped") {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/clarifiers/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: clarifier.entryId, dimension: clarifier.dimension, answer }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(answer);
      setTimeout(() => onDone({ entryId: clarifier.entryId, dimension: clarifier.dimension, answer }), 900);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function tap(value: string) {
    if (saving || saved) return;
    if (!clarifier.multi || EXCLUSIVE.has(value)) {
      setPicked([value]);
      void submit([value]);
      return;
    }
    setPicked((prev) => {
      const without = prev.filter((v) => v !== value && !EXCLUSIVE.has(v));
      return prev.includes(value) ? without : [...without, value];
    });
  }

  if (saved) {
    const label =
      saved === "skipped"
        ? "Skipped"
        : saved.map((v) => clarifier.options.find((o) => o.value === v)?.label ?? v).join(", ");
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-teal-700", compact ? "px-1 py-1.5" : "py-2")} aria-live="polite">
        <Check className="h-3.5 w-3.5" aria-hidden />
        {clarifier.foodName} · {label}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-dashed border-teal-200 bg-teal-50/40", compact ? "px-3 py-2" : "px-4 py-3")}>
      <p className="text-sm text-[var(--color-text-primary)]">
        {clarifier.question}
        <span className="ml-1.5 text-xs text-warm-500">· {clarifier.why}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {clarifier.options.map((o) => {
          const active = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => tap(o.value)}
              disabled={saving}
              aria-pressed={active}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-500 disabled:opacity-60",
                active ? "bg-teal-600 text-white" : "bg-[var(--color-surface-card)] text-warm-700 ring-1 ring-warm-200 hover:bg-teal-50"
              )}
            >
              {o.label}
            </button>
          );
        })}
        {clarifier.multi && picked.length > 0 && !picked.some((v) => EXCLUSIVE.has(v)) && (
          <button
            type="button"
            onClick={() => void submit(picked)}
            disabled={saving}
            className="min-h-9 rounded-full bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Saving" /> : "Done"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void submit("skipped")}
          disabled={saving}
          className="ml-auto min-h-9 px-2 text-xs text-warm-500 hover:text-warm-700 disabled:opacity-60"
        >
          Skip
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]" role="alert">
          Couldn&rsquo;t save that — tap again.
        </p>
      )}
    </div>
  );
}
