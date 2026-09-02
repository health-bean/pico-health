"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Apple,
  Frown,
  Pill,
  Droplets,
  Zap,
  ShieldAlert,
  Plus,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { Badge, Spinner, EmptyState, useToast } from "@/components/ui";
import { QuickAddSheet } from "@/components/quick-log/quick-add-sheet";
import { ExerciseTimelineCard } from "@/components/timeline/ExerciseTimelineCard";
import { FoodTimelineCard } from "@/components/timeline/FoodTimelineCard";
import { EntryActions } from "@/components/timeline/EntryActions";
import { cn } from "@/lib/utils";
import type { TimelineEntry, EntryType, ExerciseType, IntensityLevel } from "@/types";

const entryConfig: Record<
  EntryType,
  { icon: typeof Apple; label: string; variant: "allowed" | "avoid" | "moderation" | "info" | "default" }
> = {
  food: { icon: Apple, label: "Food", variant: "allowed" },
  symptom: { icon: Frown, label: "Symptom", variant: "avoid" },
  supplement: { icon: Pill, label: "Supplement", variant: "info" },
  medication: { icon: Pill, label: "Medication", variant: "moderation" },
  exposure: { icon: ShieldAlert, label: "Exposure", variant: "moderation" },
  detox: { icon: Droplets, label: "Detox", variant: "default" },
  exercise: { icon: Activity, label: "Exercise", variant: "info" },
  energy: { icon: Zap, label: "Energy", variant: "default" },
  off_protocol: { icon: AlertTriangle, label: "Off-Protocol", variant: "moderation" },
};

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

function formatTime(time: string | null): string {
  if (!time) return "";
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

/**
 * Rebuild a POST /api/entries payload from a deleted entry so Undo can
 * re-create it. Only includes fields the create route accepts for the type.
 */
function toCreatePayload(entry: TimelineEntry): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    entryType: entry.entryType,
    name: entry.name,
    entryDate: entry.entryDate,
  };
  if (entry.severity != null) payload.severity = entry.severity;
  if (entry.structuredContent) payload.structuredContent = entry.structuredContent;
  if (entry.entryTime) payload.entryTime = entry.entryTime;
  if (entry.energyLevel != null) payload.energyLevel = entry.energyLevel;

  if (entry.entryType === "exercise") {
    if (entry.exerciseType) payload.exerciseType = entry.exerciseType;
    if (entry.durationMinutes != null) payload.durationMinutes = entry.durationMinutes;
    if (entry.intensityLevel) payload.intensityLevel = entry.intensityLevel;
  }
  if (entry.entryType === "food") {
    if (entry.foodId) payload.foodId = entry.foodId;
    if (entry.portion) payload.portion = entry.portion;
    if (entry.mealType) payload.mealType = entry.mealType;
  }
  if (entry.entryType === "off_protocol" && entry.mealType) {
    payload.mealType = entry.mealType;
  }
  return payload;
}

export default function TimelinePage() {
  const { toast } = useToast();
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showEnergyOnly, setShowEnergyOnly] = useState(false);
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  const fetchEntries = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(date);
  }, [date, fetchEntries]);

  const restoreEntry = useCallback(
    async (entry: TimelineEntry) => {
      try {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCreatePayload(entry)),
        });
        if (!res.ok) throw new Error(`Restore failed (${res.status})`);
        toast("Entry restored", "success");
        // Refetch so the restored entry shows with its new id.
        fetchEntries(dateRef.current);
      } catch (err) {
        console.error("Failed to restore entry:", err);
        toast("Couldn't restore entry", "error");
      }
    },
    [fetchEntries, toast]
  );

  const deleteEntry = useCallback(
    async (entry: TimelineEntry) => {
      // Optimistic remove
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));

      try {
        const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          throw new Error(`Delete failed (${res.status})`);
        }
        toast("Deleted", "info", {
          action: { label: "Undo", onClick: () => void restoreEntry(entry) },
        });
      } catch (err) {
        console.error("Failed to delete entry:", err);
        // Roll back the optimistic removal
        setEntries((prev) =>
          prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]
        );
        toast("Couldn't delete entry", "error");
      }
    },
    [restoreEntry, toast]
  );

  function shiftDate(days: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(formatDate(d));
  }

  const isToday = date === formatDate(new Date());

  // Filter entries by energy level if enabled
  const filteredEntries = showEnergyOnly
    ? entries.filter((entry) => entry.energyLevel != null)
    : entries;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in-up">
      {/* Date nav */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => shiftDate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-teal-50 hover:text-teal-600 transition-all duration-200"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text-primary)]">
          {displayDate(date)}
        </h1>

        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200",
            isToday
              ? "opacity-30"
              : "hover:bg-teal-50 hover:text-teal-600"
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Energy filter toggle */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setShowEnergyOnly(!showEnergyOnly)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
            showEnergyOnly
              ? "bg-teal-100 text-teal-700"
              : "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] hover:bg-teal-50"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          {showEnergyOnly ? "Showing energy entries" : "Show energy entries only"}
        </button>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-6 w-6" />}
          title={
            showEnergyOnly
              ? "No entries with energy levels for this day."
              : "No entries for this day."
          }
          description="Go to Chat to log food, symptoms, and more."
          className="py-20"
        />
      ) : (
        <div className="flex flex-col gap-2 stagger-children">
          {filteredEntries.map((entry) => {
            // Render exercise entries with dedicated component
            if (entry.entryType === "exercise") {
              return (
                <ExerciseTimelineCard
                  key={entry.id}
                  exerciseType={entry.exerciseType as ExerciseType}
                  durationMinutes={entry.durationMinutes ?? 0}
                  intensityLevel={entry.intensityLevel as IntensityLevel}
                  energyBefore={entry.energyLevel}
                  energyAfter={null}
                  notes={
                    entry.structuredContent?.notes
                      ? String(entry.structuredContent.notes)
                      : null
                  }
                  entryTime={entry.entryTime}
                  onDelete={() => deleteEntry(entry)}
                />
              );
            }

            // Render food entries with dedicated component
            if (entry.entryType === "food") {
              return (
                <FoodTimelineCard
                  key={entry.id}
                  name={entry.name}
                  portion={entry.portion}
                  mealType={entry.mealType}
                  entryTime={entry.entryTime}
                  food={entry.food}
                  protocolViolations={entry.protocolViolations}
                  onDelete={() => deleteEntry(entry)}
                />
              );
            }

            // Render other entry types with default card
            const config = entryConfig[entry.entryType] ?? entryConfig.food;
            const Icon = config.icon;

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-card)] px-4 py-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {entry.name}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  {entry.entryTime && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatTime(entry.entryTime)}
                    </p>
                  )}
                </div>

                {entry.severity != null && (
                  <span className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
                    {entry.severity}/10
                  </span>
                )}

                <EntryActions name={entry.name} onDelete={() => deleteEntry(entry)} />
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-[var(--shadow-float)] hover:bg-teal-700 active:scale-95 transition-all duration-200 ease-[var(--ease-out-expo)] md:bottom-8 md:right-8"
        aria-label="Quick add"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Quick-add bottom sheet */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => fetchEntries(dateRef.current)}
      />
    </div>
  );
}
