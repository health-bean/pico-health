"use client";

import { useState, useRef, useEffect } from "react";

interface TriggerCellProps {
  value: string | boolean | null;
  property: string;
  options: string[];
  onChange: (value: string) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
  very_high: "bg-red-200 text-red-900 font-semibold",
  unknown: "bg-warm-100 text-warm-400",
  true: "bg-red-100 text-red-800",
  false: "bg-warm-100 text-warm-400",
};

const DISPLAY_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Med",
  high: "High",
  very_high: "V.Hi",
  unknown: "—",
  true: "Yes",
  false: "No",
};

export function TriggerCell({ value, property, options, onChange }: TriggerCellProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = value === null || value === undefined ? "unknown" : String(value);
  const colorClass = LEVEL_COLORS[displayValue] ?? LEVEL_COLORS.unknown;
  const label = DISPLAY_LABELS[displayValue] ?? displayValue;

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing]);

  if (editing) {
    return (
      <div ref={ref} className="relative">
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-md border border-warm-200 bg-[var(--color-surface-card)] shadow-lg">
          {options.map((opt) => {
            const optColor = LEVEL_COLORS[opt] ?? "";
            const optLabel = DISPLAY_LABELS[opt] ?? opt;
            const isSelected = opt === displayValue;

            return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setEditing(false);
                }}
                className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs transition-colors hover:bg-warm-50 ${
                  isSelected ? "font-semibold" : ""
                }`}
              >
                <span
                  className={`inline-block rounded px-1.5 py-0.5 ${optColor}`}
                >
                  {optLabel}
                </span>
              </button>
            );
          })}
        </div>
        <span
          className={`block cursor-pointer rounded px-1.5 py-1 text-center text-xs ${colorClass}`}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`block w-full cursor-pointer rounded px-1.5 py-1 text-center text-xs transition-all hover:ring-2 hover:ring-teal-300 ${colorClass}`}
      title={`${property}: ${displayValue} (click to edit)`}
    >
      {label}
    </button>
  );
}
