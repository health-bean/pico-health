"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Spinner, useToast } from "@/components/ui";
import { QuickAddSheet } from "@/components/quick-log/quick-add-sheet";
import { ExerciseTimelineCard } from "@/components/timeline/ExerciseTimelineCard";
import { FoodRow, clarifierLabels } from "@/components/timeline/FoodRow";
import { MealCard, formatClock } from "@/components/timeline/MealCard";
import { GenericTimelineCard } from "@/components/timeline/GenericTimelineCard";
import { DayStrip } from "@/components/timeline/DayStrip";
import { DayReflectLine } from "@/components/timeline/DayReflectLine";
import type { EntryPatch } from "@/components/timeline/EntryEditor";
import { CaptureBar } from "@/components/capture/CaptureBar";
import { PendingCaptureCard } from "@/components/capture/PendingCaptureCard";
import { ProgressStrip } from "@/components/capture/ProgressStrip";
import { SymptomNow } from "@/components/capture/SymptomNow";
import { useCapture } from "@/hooks/use-capture";
import { usePropertyPatterns } from "@/hooks/use-property-patterns";
import { cn } from "@/lib/utils";
import { chronological, groupMeals, type DayItem } from "@/lib/timeline/group-meals";
import { protocolPhrase } from "@/lib/protocols/fit-line";
import type { TimelineEntry, ExerciseType, IntensityLevel } from "@/types";

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
  const [stripOpen, setStripOpen] = useState(false);
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  // Only the latest day fetch may write to state. Tapping back through a
  // week fires several requests; without this, a slow response for an
  // earlier day could land after the current one and show a logged day as
  // empty. Superseded requests are also aborted so they stop costing anything.
  // Signing in cancels a pending deletion; the person should hear that it worked.
  const restoredShown = useRef(false);
  useEffect(() => {
    if (restoredShown.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("restored") !== "1") return;
    restoredShown.current = true;
    toast("Welcome back. Your account is no longer scheduled for deletion.", "success");
    params.delete("restored");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [toast]);

  const fetchSeq = useRef(0);
  const fetchAbort = useRef<AbortController | null>(null);
  const fetchEntries = useCallback(async (d: string) => {
    fetchAbort.current?.abort();
    const controller = new AbortController();
    fetchAbort.current = controller;
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?date=${d}`, { signal: controller.signal });
      if (seq !== fetchSeq.current) return;
      if (res.ok) {
        const data = await res.json();
        if (seq !== fetchSeq.current) return;
        setEntries(data.entries ?? []);
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("Failed to fetch entries:", err);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
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
        const created: { id: string }[] = (await res.json().catch(() => ({})))?.entries ?? [];
        // A shortcut logs in one tap, so it gets the same Undo as delete.
        toast(`Logged ${items.length} ${items.length === 1 ? "item" : "items"}`, "success", {
          action:
            created.length > 0
              ? {
                  label: "Undo",
                  onClick: () => {
                    void Promise.all(
                      created.map((e) => fetch(`/api/entries/${e.id}`, { method: "DELETE" }))
                    ).then(() => fetchEntries(dateRef.current));
                  },
                }
              : undefined,
        });
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

  const patchTimelineEntry = useCallback(
    async (entry: TimelineEntry, patch: EntryPatch): Promise<boolean> => {
      // Optimistic local update for the fields we can apply without a join.
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.mealType !== undefined ? { mealType: patch.mealType } : {}),
                ...(patch.entryTime !== undefined ? { entryTime: patch.entryTime } : {}),
                ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
                ...(patch.preparation !== undefined || patch.quantity !== undefined
                  ? {
                      structuredContent: {
                        ...(e.structuredContent ?? {}),
                        ...(patch.preparation !== undefined ? { preparation: patch.preparation } : {}),
                        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
                      },
                    }
                  : {}),
              }
            : e
        )
      );
      try {
        const res = await fetch(`/api/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`Patch failed (${res.status})`);
        // Refetch so food swaps pick up the joined food + properties.
        if (patch.foodId !== undefined) fetchEntries(dateRef.current);
        return true;
      } catch (err) {
        console.error("Failed to update entry:", err);
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
        toast("Couldn't save that change", "error");
        return false;
      }
    },
    [fetchEntries, toast]
  );

  function shiftDate(days: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(formatDate(d));
  }

  const today = formatDate(new Date());
  const isToday = date === today;
  const hasEnergyEntries = entries.some((e) => e.energyLevel != null);

  // Filter entries by energy level if enabled
  const filteredEntries = showEnergyOnly
    ? entries.filter((entry) => entry.energyLevel != null)
    : entries;

  const hasPending = sessions.length > 0;
  // Insights' patterns, fetched in the background for the food panel's "Your log".
  const patterns = usePropertyPatterns(entries.some((e) => e.entryType === "food"));
  // The day's protocol, named once above the timeline instead of on every food.
  const diet = entries.find((e) => e.fit?.diet)?.fit?.diet ?? null;

  const renderItem = (item: DayItem<TimelineEntry>) => {
    if (item.kind === "meal") {
      const tagSets = item.entries.map((e) => clarifierLabels(e.structuredContent));
      const shared = item.entries.length > 1 ? tagSets[0].filter((t) => tagSets.every((ts) => ts.includes(t))) : [];
      return (
        <MealCard mealType={item.mealType} time={item.time} tags={shared}>
          {item.entries.map((entry) => (
            <FoodRow
              key={entry.id}
              name={entry.name}
              portion={entry.portion}
              mealType={entry.mealType}
              entryTime={entry.entryTime}
              food={entry.food}
              protocolViolations={entry.protocolViolations}
              fit={entry.fit}
              foodId={entry.foodId}
              structuredContent={entry.structuredContent}
              sharedTags={shared}
              patterns={patterns}
              onDelete={() => deleteEntry(entry)}
              onPatch={(patch) => patchTimelineEntry(entry, patch)}
            />
          ))}
        </MealCard>
      );
    }
    const entry = item.entry;
    if (entry.entryType === "exercise") {
      return (
        <ExerciseTimelineCard
          exerciseType={entry.exerciseType as ExerciseType}
          durationMinutes={entry.durationMinutes ?? 0}
          intensityLevel={entry.intensityLevel as IntensityLevel}
          energyBefore={entry.energyLevel}
          energyAfter={null}
          notes={entry.structuredContent?.notes ? String(entry.structuredContent.notes) : null}
          entryTime={entry.entryTime}
          onDelete={() => deleteEntry(entry)}
          onPatch={(patch) => patchTimelineEntry(entry, patch)}
        />
      );
    }
    return (
      <GenericTimelineCard
        entryType={entry.entryType}
        name={entry.name}
        entryTime={entry.entryTime}
        severity={entry.severity}
        onDelete={() => deleteEntry(entry)}
        onPatch={(patch) => patchTimelineEntry(entry, patch)}
      />
    );
  };

  return (
    // Opacity-only entrance: a transform on this root would break `position:
    // fixed` for the capture bar, the Quick Add sheet, and entry menus inside.
    <div className={cn("mx-auto max-w-2xl px-4 py-6 animate-fade-in", isToday ? "pb-36 md:pb-28" : "pb-52 md:pb-44")}>
      {/* Only on Today: it's for the moment you come back, not for browsing past days. */}
      {isToday && <ProgressStrip part="welcome" onJumpToDay={setDate} />}

      {/* Date nav: the heading opens a week strip for jumping straight to a day */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-teal-50 hover:text-teal-600 transition-colors duration-200"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="sr-only">Log</h1>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text-primary)]">
          <button
            type="button"
            onClick={() => setStripOpen((v) => !v)}
            aria-expanded={stripOpen}
            aria-controls="log-day-strip"
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-200"
          >
            {displayDate(date)}
            <ChevronDown
              className={cn("h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200", stripOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </h2>

        {/* No "next" from today: a blank of the same size keeps the date centred. */}
        {isToday ? (
          <span className="h-11 w-11" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors duration-200 hover:bg-teal-50 hover:text-teal-600"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      <div id="log-day-strip">
        {stripOpen && <DayStrip selected={date} today={today} onSelect={setDate} />}
      </div>

      <DayReflectLine date={date} isToday={isToday} />

      {/* How you feel, first: one tap logs a symptom at the time it happens,
          which is what lets a reaction show in weeks rather than months.
          Past days get the same buttons, for backfilling at night. */}
      <SymptomNow
        key={date}
        entries={entries}
        date={date}
        isToday={isToday}
        dayLabel={displayDate(date)}
        onChanged={() => fetchEntries(dateRef.current)}
        onSomethingElse={() => document.getElementById("capture-input")?.focus()}
      />

      {/* Energy filter — only offered when the day actually has energy data */}
      {hasEnergyEntries && (
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={() => setShowEnergyOnly(!showEnergyOnly)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
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

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredEntries.length === 0 && !hasPending ? (
        // One left-aligned line, pointing at the capture bar right below.
        <p className="mt-1 max-w-[65ch] text-sm text-warm-600">
          {showEnergyOnly
            ? "No entries with energy levels for this day."
            : isToday
              ? "Nothing logged yet today. Type it below (“salmon and rice for lunch” is enough) or snap your plate."
              : "Nothing logged this day. Type it below or snap your plate to add it."}
        </p>
      ) : (
        <>
          {diet && (
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
              Foods checked against <span className="font-medium text-warm-800">{protocolPhrase(diet)}</span>. Only
              foods to limit, avoid or not rated yet are marked.
            </p>
          )}
          {/* The day as a timeline, morning to night: the time in its own
              column on one thin line, nothing boxed. Clay marks symptoms, so
              "what came before it" reads straight down the page. */}
          <ol aria-label={`${displayDate(date)}, timeline`} className="relative before:absolute before:top-3 before:bottom-3 before:left-[4.25rem] before:w-px before:bg-[var(--color-border)]">
            {groupMeals(chronological(filteredEntries)).map((item) => {
              const first = item.kind === "meal" ? item.entries[0] : item.entry;
              const time = item.kind === "meal" ? item.time : item.entry.entryTime;
              const isSymptom = item.kind === "entry" && item.entry.entryType === "symptom";
              return (
                <li key={item.kind === "meal" ? `meal-${first.id}` : first.id} className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-x-1 py-1.5">
                  {time ? (
                    <time dateTime={`${date}T${time}`} className="pt-0.5 text-right text-xs tabular-nums text-[var(--color-text-muted)]">
                      {formatClock(time)}
                    </time>
                  ) : (
                    <span className="pt-0.5 text-right text-xs text-[var(--color-text-muted)]">No time</span>
                  )}
                  <span
                    className={cn(
                      "relative z-10 mt-1.5 justify-self-center rounded-full ring-4 ring-[var(--color-surface)]",
                      isSymptom ? "h-2.5 w-2.5 bg-clay-500" : "h-2 w-2 bg-warm-400"
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">{renderItem(item)}</div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {/* In-flight captures land at the end of the day, right above the bar they were typed into */}
      {hasPending && (
        <div className="mt-3 flex flex-col gap-3">
          {sessions.map((session) => (
            <PendingCaptureCard
              key={session.id}
              session={session}
              onUndo={() => void undoSession(session.id)}
              onDismiss={() => dismissSession(session.id)}
              onRetry={
                session.status === "error" && session.sourceText && !session.imagePreviewUrl
                  ? () => {
                      const retryText = session.sourceText as string;
                      dismissSession(session.id);
                      void submitText(retryText);
                    }
                  : undefined
              }
              onRemoveEntry={(entryId) => void removeEntry(session.id, entryId)}
              onPatchEntry={(entryId, patch) => patchEntry(session.id, entryId, patch)}
              onClarified={() => fetchEntries(dateRef.current)}
            />
          ))}
        </div>
      )}


      {/* "Day N of 30" while a tracking goal runs; nothing otherwise. */}
      <ProgressStrip part="progress" />

      {/* The pen is always out */}
      <CaptureBar
        onSubmitText={(text) => void submitText(text)}
        dayLabel={isToday ? undefined : displayDate(date)}
        onBackToToday={() => setDate(today)}
        onSubmitImage={(input) => void submitImage(input)}
        onBrowse={() => setSheetOpen(true)}
        onShortcut={(items) => void logShortcut(items)}
      />

      {/* Quick-add bottom sheet (structured fallback) */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => fetchEntries(dateRef.current)}
        entryDate={date}
        dayLabel={isToday ? undefined : displayDate(date)}
      />
    </div>
  );
}
