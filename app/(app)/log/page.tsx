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
  Activity,
  AlertTriangle,
  NotebookPen,
} from "lucide-react";
import { Badge, Spinner, EmptyState, useToast } from "@/components/ui";
import { QuickAddSheet } from "@/components/quick-log/quick-add-sheet";
import { ExerciseTimelineCard } from "@/components/timeline/ExerciseTimelineCard";
import { FoodTimelineCard } from "@/components/timeline/FoodTimelineCard";
import { EntryActions } from "@/components/timeline/EntryActions";
import { CaptureBar } from "@/components/capture/CaptureBar";
import { PendingCaptureCard } from "@/components/capture/PendingCaptureCard";
import { ProgressStrip } from "@/components/capture/ProgressStrip";
import { useCapture } from "@/hooks/use-capture";
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function localTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

  const {
    sessions,
    submitText,
    submitImage,
    undoSession,
    dismissSession,
    removeEntry,
    patchEntry,
  } = useCapture({
    entryDate: date,
    onSettled: () => fetchEntries(dateRef.current),
  });

  const logShortcut = useCallback(
    async (items: { entryType: string; name: string; foodId?: string; mealType?: string }[]) => {
      const now = new Date();
      try {
        const res = await fetch("/api/entries/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: items.map((item) => ({
              entryType: item.entryType,
              name: item.name,
              entryDate: dateRef.current,
              entryTime: localTimeString(now),
              foodId: item.foodId,
              mealType: item.mealType,
            })),
          }),
        });
        if (!res.ok) throw new Error(`Batch failed (${res.status})`);
        toast(`Logged ${items.length} ${items.length === 1 ? "item" : "items"}`, "success");
        fetchEntries(dateRef.current);
      } catch {
        toast("Couldn't log that — try typing it instead", "error");
      }
    },
    [fetchEntries, toast]
  );

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
  const hasEnergyEntries = entries.some((e) => e.energyLevel != null);

  // Filter entries by energy level if enabled
  const filteredEntries = showEnergyOnly
    ? entries.filter((entry) => entry.energyLevel != null)
    : entries;

  const hasPending = sessions.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-36 md:pb-28 animate-fade-in-up">
      <ProgressStrip />

      {/* Date nav */}
      <div className="mb-4 flex items-center justify-between">
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
            isToday ? "opacity-30" : "hover:bg-teal-50 hover:text-teal-600"
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Energy filter — only offered when the day actually has energy data */}
      {hasEnergyEntries && (
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
            {showEnergyOnly ? "Showing energy entries" : "Energy only"}
          </button>
        </div>
      )}

      {/* In-flight captures land at the top of the day */}
      {hasPending && (
        <div className="mb-4 flex flex-col gap-3">
          {sessions.map((session) => (
            <PendingCaptureCard
              key={session.id}
              session={session}
              onUndo={() => void undoSession(session.id)}
              onDismiss={() => dismissSession(session.id)}
              onRemoveEntry={(entryId) => void removeEntry(session.id, entryId)}
              onPatchEntry={(entryId, patch) => patchEntry(session.id, entryId, patch)}
            />
          ))}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredEntries.length === 0 && !hasPending ? (
        <EmptyState
          icon={<NotebookPen className="h-6 w-6" />}
          title={
            showEnergyOnly
              ? "No entries with energy levels for this day."
              : isToday
                ? "Nothing logged yet today."
                : "Nothing logged this day."
          }
          description={
            showEnergyOnly
              ? undefined
              : "Type it below — “salmon and rice for lunch” is enough. Or snap a photo of your plate."
          }
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

      {/* The pen is always out */}
      <CaptureBar
        onSubmitText={(text) => void submitText(text)}
        onSubmitImage={(input) => void submitImage(input)}
        onBrowse={() => setSheetOpen(true)}
        onShortcut={(items) => void logShortcut(items)}
      />

      {/* Quick-add bottom sheet (structured fallback) */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => fetchEntries(dateRef.current)}
      />
    </div>
  );
}
