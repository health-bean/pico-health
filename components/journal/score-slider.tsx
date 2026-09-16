"use client";

import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  hideLabel?: boolean;
}

// Every score is the same instrument, so every slider is the same color.
// The rating is carried by the number and the labels, not by a hue per row.
const colors = { bg: "bg-warm-50", accent: "accent-teal-600", track: "text-teal-700" };

export function ScoreSlider({ label, value, onChange, hideLabel }: ScoreSliderProps) {
  const displayValue = value ?? 5;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
        )}
        <span className={cn("text-sm font-semibold", hideLabel && "ml-auto", colors.track)}>
          {value !== null ? `${value}/10` : "—"}
        </span>
      </div>
      <div className={cn("rounded-lg px-3 py-2", colors.bg)}>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={displayValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className={cn(
            "w-full h-2 rounded-lg appearance-none cursor-pointer",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[28px] [&::-webkit-slider-thumb]:w-[28px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-current",
            colors.accent,
            colors.track
          )}
          style={{ minHeight: "44px" }}
          aria-label={`${label} score`}
        />
      </div>
    </div>
  );
}
