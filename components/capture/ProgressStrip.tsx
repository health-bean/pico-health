"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Target } from "lucide-react";
import { Dialog } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Stats {
  daysTracked: number;
  firstEntryDate: string | null;
  trackingGoalDays: number | null;
  trackingGoalStartDate: string | null;
}

const PATTERN_THRESHOLD = 14;
const GOAL_OPTIONS = [30, 60, 90] as const;

function daysSince(dateStr: string): number {
  const start = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
}

/**
 * The mandate layer: one slim strip, two framings.
 * Default: progress toward the ~14 days the engine needs before patterns appear.
 * With a tracking goal set (e.g. a practitioner's "30 days"): day N of goal + export.
 */
export function ProgressStrip() {
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

  const hasGoal = stats.trackingGoalDays != null && stats.trackingGoalStartDate != null;
  const goalDay = hasGoal ? Math.min(daysSince(stats.trackingGoalStartDate!), stats.trackingGoalDays!) : 0;
  const pct = hasGoal
    ? Math.min(100, (goalDay / stats.trackingGoalDays!) * 100)
    : Math.min(100, (stats.daysTracked / PATTERN_THRESHOLD) * 100);

  let line: string;
  if (hasGoal) {
    line =
      goalDay >= stats.trackingGoalDays!
        ? `${stats.trackingGoalDays} days tracked — ready to share`
        : `Day ${goalDay} of ${stats.trackingGoalDays}`;
  } else if (stats.daysTracked === 0) {
    line = "Log your first day — patterns typically appear around day 14";
  } else if (stats.daysTracked < PATTERN_THRESHOLD) {
    line = `Day ${stats.daysTracked} — patterns typically appear around day 14`;
  } else {
    line = `${stats.daysTracked} days tracked`;
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setGoalOpen(true)}
          className="group flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-teal-500"
          aria-label={`${line}. Set a tracking goal.`}
        >
          <span className="min-w-0 truncate text-xs text-warm-500 transition-colors group-hover:text-warm-700">
            {line}
          </span>
          <span
            className="h-1 max-w-24 flex-1 overflow-hidden rounded-full bg-warm-200"
            aria-hidden
          >
            <span
              className="block h-full rounded-full bg-teal-400 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </span>
        </button>
        {hasGoal && (
          <a
            href="/api/export?type=all"
            className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export
          </a>
        )}
      </div>

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
