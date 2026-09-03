"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Zap,
  Smile,
  Brain,
  Heart,
  Check,
  Loader2,
} from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui";
import { ScoreSlider } from "@/components/journal/score-slider";
import { ClarifierFillIns } from "@/components/clarifiers/ClarifierFillIns";
import { cn } from "@/lib/utils";
import type { JournalEntry, JournalScores } from "@/types";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function displayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDate(date) === formatDate(today)) return "Today";
  if (formatDate(date) === formatDate(yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const scoreConfig = [
  {
    key: "sleepScore" as const,
    label: "Sleep Quality",
    icon: Moon,
    color: "indigo",
    lowLabel: "Terrible",
    highLabel: "Excellent",
  },
  {
    key: "energyScore" as const,
    label: "Energy Level",
    icon: Zap,
    color: "amber",
    lowLabel: "Exhausted",
    highLabel: "Energized",
  },
  {
    key: "moodScore" as const,
    label: "Mood",
    icon: Smile,
    color: "green",
    lowLabel: "Low",
    highLabel: "Great",
  },
  {
    key: "stressScore" as const,
    label: "Stress",
    icon: Brain,
    color: "red",
    lowLabel: "Very stressed",
    highLabel: "Calm",
  },
  {
    key: "painScore" as const,
    label: "Pain / Discomfort",
    icon: Heart,
    color: "orange",
    lowLabel: "Severe",
    highLabel: "None",
  },
];

export default function ReflectPage() {
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [scores, setScores] = useState<JournalScores>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [weekEntries, setWeekEntries] = useState<Record<string, boolean>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isToday = date === formatDate(new Date());

  // Fetch week streak data
  const fetchWeek = useCallback(async () => {
    try {
      const res = await fetch("/api/journal?days=7");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, boolean> = {};
        for (const e of data.entries ?? []) {
          map[e.entryDate] = true;
        }
        setWeekEntries(map);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch entry for current date and week streak in parallel
  const fetchEntry = useCallback(async (d: string) => {
    setLoading(true);
    setSaved(false);
    setHasChanges(false);
    try {
      const [entryRes] = await Promise.all([
        fetch(`/api/journal?date=${d}`),
        fetchWeek(),
      ]);
      if (entryRes.ok) {
        const data = await entryRes.json();
        const e = data.entry ?? null;
        setEntry(e);
        if (e) {
          setScores({
            sleepScore: e.sleepScore ?? undefined,
            energyScore: e.energyScore ?? undefined,
            moodScore: e.moodScore ?? undefined,
            stressScore: e.stressScore ?? undefined,
            painScore: e.painScore ?? undefined,
          });
          setNotes(e.notes ?? "");
        } else {
          setScores({});
          setNotes("");
        }
      }
    } catch (err) {
      console.error("Failed to fetch journal:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWeek]);

  // Re-fetch week streak when an entry is saved
  useEffect(() => {
    if (saved) {
      fetchWeek();
    }
  }, [saved, fetchWeek]);

  useEffect(() => {
    fetchEntry(date);
  }, [date, fetchEntry]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function shiftDate(days: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(formatDate(d));
  }

  function handleScoreChange(key: keyof JournalScores, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
    scheduleAutoSave({ ...scores, [key]: value }, notes);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    setHasChanges(true);
    setSaved(false);
    scheduleAutoSave(scores, value);
  }

  function scheduleAutoSave(s: JournalScores, n: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doSave(s, n);
    }, 1500);
  }

  async function doSave(s: JournalScores, n: string) {
    const hasScores = Object.values(s).some(
      (v) => v !== undefined && typeof v === "number"
    );
    if (!hasScores && !n.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: date,
          ...s,
          ...(n.trim() ? { notes: n } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry ?? null);
        setHasChanges(false);
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to save journal:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(scores, notes);
  }

  // Week streak dots
  const weekDays = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    weekDays.push({
      date: ds,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      hasEntry: !!weekEntries[ds],
      isSelected: ds === date,
    });
  }

  const filledCount = Object.values(scores).filter(
    (v) => v !== undefined && typeof v === "number"
  ).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Date nav */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => shiftDate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="text-base font-semibold text-warm-900">
          {displayDate(date)}
        </h1>

        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg text-warm-500",
            isToday ? "opacity-30" : "hover:bg-warm-100"
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Week streak */}
      <div className="mb-6 flex items-center justify-center gap-3">
        {weekDays.map((day) => (
          <button
            key={day.date}
            onClick={() => setDate(day.date)}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[10px] font-medium text-warm-400">
              {day.label}
            </span>
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                day.isSelected
                  ? "bg-teal-600 text-white"
                  : day.hasEntry
                    ? "bg-teal-100 text-teal-700"
                    : "bg-warm-100 text-warm-400"
              )}
            >
              {day.hasEntry && !day.isSelected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                new Date(day.date + "T12:00:00").getDate()
              )}
            </div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-warm-400">
              {filledCount}/5 areas rated
            </span>
            <div className="flex items-center gap-1.5">
              {saving && (
                <span className="flex items-center gap-1 text-xs text-warm-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
              {saved && !saving && !hasChanges && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              {hasChanges && !saving && (
                <span className="text-xs text-amber-500">Unsaved</span>
              )}
            </div>
          </div>

          {/* Open clarifier questions for the day (hidden when none) */}
          <ClarifierFillIns date={date} />

          {/* Score cards */}
          {scoreConfig.map((cfg) => {
            const Icon = cfg.icon;
            const value = scores[cfg.key] ?? null;

            return (
              <Card key={cfg.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-warm-500" />
                  <span className="text-sm font-medium text-warm-700">
                    {cfg.label}
                  </span>
                </div>
                <ScoreSlider
                  label={cfg.label}
                  value={value}
                  onChange={(v) => handleScoreChange(cfg.key, v)}
                  color={cfg.color}
                  hideLabel
                />
                <div className="mt-1 flex items-center justify-between text-[10px] text-warm-400">
                  <span>{cfg.lowLabel}</span>
                  <span>{cfg.highLabel}</span>
                </div>
              </Card>
            );
          })}

          {/* Notes */}
          <Card>
            <label className="mb-2 block text-sm font-medium text-warm-700">
              Notes & Reflections
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="How are you feeling overall? Any patterns, insights, or things worth noting…"
              rows={4}
              className="w-full resize-none rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              maxLength={2000}
            />
            {notes.length > 0 && (
              <p className="mt-1 text-right text-[10px] text-warm-400">
                {notes.length}/2000
              </p>
            )}
          </Card>

          {/* Save button */}
          <Button
            onClick={handleManualSave}
            loading={saving}
            disabled={!hasChanges && !saving}
            className="w-full"
          >
            {saving
              ? "Saving…"
              : saved && !hasChanges
                ? "Saved"
                : "Save Reflection"}
          </Button>
        </div>
      )}
    </div>
  );
}
