"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayStripProps {
  /** YYYY-MM-DD currently shown on Log. */
  selected: string;
  /** YYYY-MM-DD for today (local). */
  today: string;
  onSelect: (date: string) => void;
}

function toDate(s: string): Date {
  return new Date(s + "T12:00:00");
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(s: string, n: number): string {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

/**
 * Seven days at a glance, each a 44px target, with a dot on days that have
 * entries so "did I log Tuesday?" is answered by looking, not by tapping
 * back through the week. A native date input handles anything further away.
 */
export function DayStrip({ selected, today, onSelect }: DayStripProps) {
  // The week ends on today unless the selected day is older than that, in
  // which case it ends on the selected day so the selection stays visible.
  const end = selected < addDays(today, -6) ? selected : today;
  const start = addDays(end, -6);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) out.push(addDays(start, i));
    return out;
  }, [start]);

  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/entries/days?from=${start}&to=${end}`)
      .then((r) => (r.ok ? r.json() : { days: {} }))
      .then((data) => {
        if (!cancelled) setCounts(data.days ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  return (
    <div className="mb-4 flex flex-col items-center gap-2 animate-fade-in">
      <div role="group" aria-label="Pick a day this week" className="flex items-center gap-1">
        {days.map((day) => {
          const d = toDate(day);
          const isSelected = day === selected;
          const isFuture = day > today;
          const logged = (counts[day] ?? 0) > 0;
          const label = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
          return (
            <button
              key={day}
              type="button"
              disabled={isFuture}
              aria-pressed={isSelected}
              aria-label={`${label}${logged ? `, ${counts[day]} logged` : ""}`}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-11 w-11 flex-col items-center justify-center rounded-xl text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-teal-600 text-white"
                  : isFuture
                    ? "text-warm-300"
                    : "text-warm-700 hover:bg-teal-50"
              )}
            >
              <span className="text-[11px] font-medium leading-none opacity-80">
                {d.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span className="mt-0.5 leading-none">{d.getDate()}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-1 w-1 rounded-full",
                  logged ? (isSelected ? "bg-white/80" : "bg-teal-500") : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
      <label className="relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-teal-600 hover:bg-teal-50 hover:text-teal-700">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        Jump to a date
        <input
          type="date"
          value={selected}
          max={today}
          onChange={(e) => {
            if (e.target.value && e.target.value <= today) onSelect(e.target.value);
          }}
          aria-label="Jump to a date"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
