"use client";

import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  hideLabel?: boolean;
  /** Words for the two ends of the scale, read to assistive tech with the value. */
  lowLabel?: string;
  highLabel?: string;
}

// Fill width for each score, as fixed classes so no inline style is needed.
const FILL_WIDTH: Record<number, string> = {
  1: "w-[0%]", 2: "w-[11%]", 3: "w-[22%]", 4: "w-[33%]", 5: "w-[44%]",
  6: "w-[56%]", 7: "w-[67%]", 8: "w-[78%]", 9: "w-[89%]", 10: "w-[100%]",
};

/**
 * A 1–10 rating. The track is drawn (a native range with appearance:none
 * has none), the fill grows with the score, and until the person has
 * touched it the thumb is hollow, so "not rated" never looks like a 5.
 */
export function ScoreSlider({ label, value, onChange, hideLabel, lowLabel, highLabel }: ScoreSliderProps) {
  const rated = value !== null;
  const displayValue = value ?? 5;
  const valueText = rated
    ? `${value} of 10${lowLabel && highLabel ? `, from ${lowLabel.toLowerCase()} to ${highLabel.toLowerCase()}` : ""}`
    : "Not rated yet";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
        )}
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            hideLabel && "ml-auto",
            rated ? "text-teal-700" : "text-[var(--color-text-muted)]"
          )}
        >
          {rated ? `${value}/10` : "Not rated"}
        </span>
      </div>
      <div className="relative flex min-h-11 items-center rounded-lg bg-warm-50 px-3">
        {/* Drawn track and fill sit under a transparent native range */}
        <div className="pointer-events-none absolute inset-x-3 h-2 rounded-full bg-warm-200" aria-hidden="true" />
        <div
          className={cn(
            "pointer-events-none absolute left-3 h-2 rounded-full bg-teal-500 transition-[width] duration-150",
            rated ? FILL_WIDTH[displayValue] : "w-[0%]"
          )}
          aria-hidden="true"
        />
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={displayValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          // An untouched slider already sits at 5, so tapping or releasing
          // there fires no change event. Commit the position on release so
          // "about a 5", the most common foggy-day answer, can be recorded.
          onPointerUp={(e) => {
            if (!rated) onChange(parseInt(e.currentTarget.value, 10));
          }}
          onKeyDown={(e) => {
            if (!rated && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onChange(parseInt(e.currentTarget.value, 10));
            }
          }}
          aria-label={`${label} score`}
          aria-valuetext={valueText}
          className={cn(
            "relative z-10 h-11 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:-mt-[10px] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-[var(--color-surface-card)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] [&::-webkit-slider-thumb]:transition-colors",
            "[&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-[var(--color-surface-card)]",
            rated
              ? "[&::-webkit-slider-thumb]:border-teal-600 [&::-moz-range-thumb]:border-teal-600"
              : "[&::-webkit-slider-thumb]:border-dashed [&::-webkit-slider-thumb]:border-warm-400 [&::-moz-range-thumb]:border-dashed [&::-moz-range-thumb]:border-warm-400"
          )}
        />
      </div>
    </div>
  );
}
