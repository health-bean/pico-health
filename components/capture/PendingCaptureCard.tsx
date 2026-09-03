"use client";

import { useEffect, useState } from "react";
import { X, Check, RotateCcw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FoodSearchInput } from "@/components/quick-log/FoodSearchInput";
import { ClarifierRow } from "@/components/clarifiers/ClarifierRow";
import { MEAL_TYPES } from "@/types/capture";
import type { CaptureSession, CapturedEntry } from "@/types/capture";
import type { Clarifier } from "@/lib/clarifiers/types";
import type { Food } from "@/types";

interface PendingCaptureCardProps {
  session: CaptureSession;
  onUndo: () => void;
  onDismiss: () => void;
  onRemoveEntry: (entryId: string) => void;
  onPatchEntry: (
    entryId: string,
    patch: { foodId?: string | null; name?: string; mealType?: string; entryTime?: string }
  ) => Promise<boolean>;
  protocolId?: string;
}

const TYPE_LABEL: Record<string, string> = {
  food: "Food",
  symptom: "Symptom",
  supplement: "Supplement",
  medication: "Medication",
  exposure: "Exposure",
  detox: "Detox",
  exercise: "Exercise",
  energy: "Energy",
  off_protocol: "Off-protocol",
};

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function mealLabel(meal: string | null): string {
  if (!meal) return "";
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

/** One captured entry as an editable chip row. */
function EntryChip({
  entry,
  editing,
  onEdit,
  onCloseEdit,
  onRemove,
  onPatch,
  protocolId,
}: {
  entry: CapturedEntry;
  editing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onRemove: () => void;
  onPatch: PendingCaptureCardProps["onPatchEntry"] extends (id: string, p: infer P) => infer R
    ? (patch: P) => R
    : never;
  protocolId?: string;
}) {
  const isFood = entry.entryType === "food";
  const offProtocol = entry.protocolViolations.length > 0;

  return (
    <div className="animate-fade-in-up">
      <div
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5",
          "border-[var(--color-border-light)] bg-[var(--color-surface)]"
        )}
      >
        <button
          type="button"
          onClick={isFood ? onEdit : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 text-left",
            isFood && "cursor-pointer"
          )}
          aria-label={isFood ? `Edit ${entry.name}` : undefined}
          disabled={!isFood}
        >
          <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {entry.name}
          </span>
          <span className="shrink-0 text-xs text-warm-500">
            {TYPE_LABEL[entry.entryType] ?? entry.entryType}
            {entry.severity != null && ` · ${entry.severity}/10`}
          </span>
          {isFood && <Pencil className="h-3 w-3 shrink-0 text-warm-400" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-600 focus-visible:outline-2 focus-visible:outline-teal-500"
          aria-label={`Remove ${entry.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {offProtocol && (
        <p className="mt-1 pl-3 text-xs text-[var(--color-warning)]">
          Outside your protocol · {entry.protocolViolations.join(", ")}
        </p>
      )}

      {editing && (
        <div className="mt-2 rounded-xl border border-teal-200 bg-[var(--color-surface)] p-2">
          <FoodSearchInput
            autoFocus
            protocolId={protocolId}
            placeholder={`Replace "${entry.name}"…`}
            onSelect={(food: Food) => {
              void onPatch({ foodId: food.id, name: food.displayName });
              onCloseEdit();
            }}
          />
          <button
            type="button"
            onClick={onCloseEdit}
            className="mt-1 text-xs text-warm-500 hover:text-warm-700"
          >
            Keep &ldquo;{entry.name}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

export function PendingCaptureCard({
  session,
  onUndo,
  onDismiss,
  onRemoveEntry,
  onPatchEntry,
  protocolId,
}: PendingCaptureCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clarifier, setClarifier] = useState<Clarifier | null>(null);
  const first = session.entries[0];
  const foodEntries = session.entries.filter((e) => e.entryType === "food");

  // Once saved, ask the rules engine for the one follow-up worth asking.
  // Deterministic and cheap; the card never waits on it.
  const savedFoodIds = session.status === "saved" ? foodEntries.map((e) => e.id).join(",") : "";
  useEffect(() => {
    if (!savedFoodIds) return;
    let cancelled = false;
    fetch(`/api/clarifiers?entryIds=${savedFoodIds}`)
      .then((r) => (r.ok ? r.json() : { clarifiers: [] }))
      .then((data: { clarifiers?: Clarifier[] }) => {
        if (!cancelled) setClarifier(data.clarifiers?.[0] ?? null);
      })
      .catch(() => {
        /* optional — stay silent */
      });
    return () => {
      cancelled = true;
    };
  }, [savedFoodIds]);

  // If the user removed or swapped the entry the question was about, drop it.
  const activeClarifier =
    clarifier && session.entries.some((e) => e.id === clarifier.entryId && e.foodId === clarifier.foodId)
      ? clarifier
      : null;
  const contextBits = [
    foodEntries.length > 0 && first?.mealType ? mealLabel(first.mealType) : null,
    first?.entryTime ? formatTime(first.entryTime) : null,
  ].filter(Boolean);

  if (session.status === "error") {
    return (
      <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-card)] p-4 shadow-sm">
        <p className="text-sm text-[var(--color-text-primary)]">{session.error}</p>
        {session.sourceText && (
          <p className="mt-1 text-xs text-warm-500">&ldquo;{session.sourceText}&rdquo;</p>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-[var(--color-surface-card)] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {session.imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL thumbnail
            <img
              src={session.imagePreviewUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          )}
          <p className="truncate text-xs font-medium text-warm-500">
            {session.status === "streaming" ? (
              "Reading…"
            ) : (
              <span className="flex items-center gap-1 text-teal-700">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Saved {session.entries.length}{" "}
                {session.entries.length === 1 ? "entry" : "entries"}
                {contextBits.length > 0 && (
                  <span className="text-warm-500"> · {contextBits.join(" · ")}</span>
                )}
              </span>
            )}
          </p>
        </div>
        {session.status === "saved" && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onUndo}
              className="flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-warm-600 transition-colors hover:bg-warm-100 focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Undo
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex min-h-8 items-center rounded-lg bg-teal-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {session.entries.map((entry) => (
          <EntryChip
            key={entry.id}
            entry={entry}
            editing={editingId === entry.id}
            onEdit={() => setEditingId(entry.id)}
            onCloseEdit={() => setEditingId(null)}
            onRemove={() => onRemoveEntry(entry.id)}
            onPatch={(patch) => onPatchEntry(entry.id, patch)}
            protocolId={protocolId}
          />
        ))}
        {session.status === "streaming" && (
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-light)] px-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" aria-hidden />
            <span className="text-sm text-warm-500">Listening for what you had…</span>
          </div>
        )}
      </div>

      {session.note && session.status === "saved" && (
        <p className="mt-2 text-xs text-warm-500">{session.note}</p>
      )}

      {activeClarifier && (
        <div className="mt-2">
          <ClarifierRow compact clarifier={activeClarifier} onDone={() => setClarifier(null)} />
        </div>
      )}

      {session.status === "saved" && foodEntries.length > 0 && (
        <MealTimeEditor
          entries={foodEntries}
          onPatchEntry={onPatchEntry}
        />
      )}
    </div>
  );
}

/** Compact meal + time correction for every food entry in the capture at once. */
function MealTimeEditor({
  entries,
  onPatchEntry,
}: {
  entries: CapturedEntry[];
  onPatchEntry: PendingCaptureCardProps["onPatchEntry"];
}) {
  const current = entries[0]?.mealType ?? null;
  const currentTime = entries[0]?.entryTime ?? "";
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-warm-500 underline decoration-warm-300 underline-offset-2 hover:text-warm-700"
      >
        Wrong meal or time?
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {MEAL_TYPES.map((meal) => (
        <button
          key={meal}
          type="button"
          onClick={() => {
            entries.forEach((e) => void onPatchEntry(e.id, { mealType: meal }));
          }}
          className={cn(
            "min-h-8 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-500",
            current === meal
              ? "bg-teal-100 text-teal-700"
              : "bg-warm-100 text-warm-600 hover:bg-teal-50"
          )}
        >
          {mealLabel(meal)}
        </button>
      ))}
      <input
        type="time"
        defaultValue={currentTime.slice(0, 5)}
        onChange={(e) => {
          if (e.target.value) {
            entries.forEach((en) => void onPatchEntry(en.id, { entryTime: e.target.value }));
          }
        }}
        aria-label="Time eaten"
        className="min-h-8 rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface)] px-2 text-xs text-warm-700"
      />
    </div>
  );
}
