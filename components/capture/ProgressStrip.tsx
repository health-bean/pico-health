"use client";

import { useCallback, useEffect, useState } from "react";
import { Target } from "lucide-react";
import { dayOf, goalStatus } from "@/lib/capture/tracking-goal";
import { Dialog } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Stats {
  daysTracked: number;
  firstEntryDate: string | null;
  lastEntryDate: string | null;
  trackingGoalDays: number | null;
  trackingGoalStartDate: string | null;
}

const GOAL_OPTIONS = [30, 60, 90] as const;


/**
 * The mandate layer. A tracking goal (e.g. a practitioner's "30 days") is
 * counted on the Log while it runs, and set or changed in Settings. Nothing
 * shows on the Log without one: a bare day count helped nobody log.
 */
interface ProgressStripProps {
  /** Jump the Log to a given day (YYYY-MM-DD). */
  onJumpToDay?: (date: string) => void;
  /**
   * "welcome": the back-after-a-break notice (top of the Log).
   * "progress": "Day N of 30" below the day's list, only while a goal runs.
   * "settings": set, change or clear the goal (Settings › Your data).
   */
  part: "welcome" | "progress" | "settings";
}

export function ProgressStrip({ onJumpToDay, part }: ProgressStripProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/entries/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // strip is a whisper; stay silent on failure
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setGoal = useCallback(
    async (days: number | null) => {
      setSaving(true);
      try {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingGoalDays: days }),
        });
        if (res.ok) {
          await load();
          setGoalOpen(false);
        }
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  if (!stats) return null;

  const goal = goalStatus(stats, new Date());

  // Coming back after a break (flares make breaks normal): say when the last
  // entry was and offer a one-tap bridge to it.
  const gapDays = stats.lastEntryDate ? dayOf(stats.lastEntryDate, new Date()) - 1 : 0;
  const returning = gapDays > 2 && stats.lastEntryDate != null;
  const lastLabel = stats.lastEntryDate
    ? new Date(stats.lastEntryDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <>
      {/* The ground's own darker step: a quiet notice in the palette, not a grey slab. */}
      {part === "welcome" && returning && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-overlay)] px-3 text-sm text-warm-700">
          <span className="py-2">
            Welcome back. You last logged on <span className="font-medium text-warm-900">{lastLabel}</span>.
          </span>
          {onJumpToDay && (
            <button
              type="button"
              onClick={() => onJumpToDay(stats.lastEntryDate!)}
              className="-mr-2 min-h-11 shrink-0 rounded-lg px-2 font-medium text-teal-700 hover:bg-teal-50"
            >
              See that day
            </button>
          )}
        </div>
      )}

      {/* On the Log only while a goal is being counted: "Day 12 of 30" keeps
          a practitioner's "track for 30 days" going. Otherwise it's in Settings. */}
      {part === "progress" && goal.showOnLog && (
        <button
          type="button"
          onClick={() => setGoalOpen(true)}
          className="group -mx-1 mt-6 flex min-h-11 w-full items-center gap-3 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-teal-500"
          aria-label={`Day ${goal.day} of your ${goal.total}-day tracking goal. Change the goal.`}
        >
          <span className="shrink-0 text-sm text-warm-600 transition-colors group-hover:text-warm-800">
            Day {goal.day} of {goal.total}
          </span>
          <span className="h-1 max-w-24 flex-1 overflow-hidden rounded-full bg-warm-200" aria-hidden>
            <span
              className="block h-full rounded-full bg-teal-400 transition-[width] duration-500"
              style={{ width: `${goal.pct}%` }}
            />
          </span>
        </button>
      )}

      {part === "settings" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-warm-600">
            {!goal.hasGoal
              ? "Tracking for a practitioner, or for yourself? Set a length and the Log counts the days."
              : goal.done
                ? `Your ${goal.total}-day goal is done. Export your data below to share it.`
                : `Day ${goal.day} of ${goal.total}. The count shows on your Log until the goal is done.`}
          </p>
          <button
            type="button"
            onClick={() => setGoalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-300 px-4 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            {goal.hasGoal ? "Change goal" : "Set a goal"}
          </button>
        </div>
      )}

      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} title="Tracking goal">
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Tracking for a practitioner, or setting yourself a window? Pick a length and the
          Log will count the days for you.
        </p>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              disabled={saving}
              onClick={() => void setGoal(days)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-500",
                stats.trackingGoalDays === days
                  ? "border-teal-400 bg-teal-50 text-teal-700"
                  : "border-[var(--color-border-light)] text-warm-700 hover:border-teal-300"
              )}
            >
              <Target className="h-4 w-4 text-teal-600" aria-hidden />
              {days} days
            </button>
          ))}
        </div>
        {stats.trackingGoalDays != null && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void setGoal(null)}
            className="mt-3 text-xs text-warm-500 underline decoration-warm-300 underline-offset-2 hover:text-warm-700"
          >
            Clear goal
          </button>
        )}
      </Dialog>
    </>
  );
}
