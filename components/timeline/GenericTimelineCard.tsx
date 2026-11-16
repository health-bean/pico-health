"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Clock,
  Frown,
  Pill,
  ShieldAlert,
  Droplets,
  Zap,
  AlertTriangle,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntryActions } from "./EntryActions";
import { EntryEditor, type EntryPatch } from "./EntryEditor";
import { formatClock } from "./MealCard";
import type { EntryType } from "@/types";

interface GenericTimelineCardProps {
  entryType: EntryType;
  name: string;
  entryTime?: string | null;
  severity?: number | null;
  onDelete?: () => void;
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
}

/**
 * Each kind gets its own icon colour so a day scans by kind. Symptoms are the
 * one row with a tinted ground: "what happened after that meal?" is the
 * question the Log exists to answer.
 */
const KIND: Record<Exclude<EntryType, "food" | "exercise">, { icon: LucideIcon; label: string; tile: string }> = {
  symptom: { icon: Frown, label: "Symptom", tile: "bg-clay-500/15 text-clay-700" },
  supplement: { icon: Pill, label: "Supplement", tile: "bg-warm-100 text-warm-600" },
  medication: { icon: Pill, label: "Medication", tile: "bg-warm-100 text-warm-600" },
  exposure: { icon: ShieldAlert, label: "Exposure", tile: "bg-gold-50 text-ochre-700" },
  detox: { icon: Droplets, label: "Detox", tile: "bg-teal-50 text-teal-600" },
  energy: { icon: Zap, label: "Energy", tile: "bg-teal-50 text-teal-600" },
  off_protocol: { icon: AlertTriangle, label: "Off-protocol", tile: "bg-ochre-500/10 text-ochre-700" },
};

const FALLBACK = { icon: Activity, label: "Entry", tile: "bg-warm-100 text-warm-600" };

/**
 * A slim row for every entry type without a dedicated card (symptom,
 * supplement, medication, exposure, detox, energy, off-protocol).
 */
export function GenericTimelineCard({
  entryType,
  name,
  entryTime,
  severity,
  onDelete,
  onPatch,
}: GenericTimelineCardProps) {
  const [editing, setEditing] = useState(false);
  const isSymptom = entryType === "symptom";
  const kind = KIND[entryType as keyof typeof KIND] ?? FALLBACK;
  const Icon = kind.icon;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border",
        isSymptom ? "border-clay-500/25 bg-clay-50/60" : "border-warm-200 bg-[var(--color-surface-card)]"
      )}
    >
      <div className="flex min-h-12 items-center gap-3 py-1 pl-3 pr-1">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", kind.tile)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">{name}</span>
          <span className={cn("block text-xs", isSymptom ? "text-clay-700" : "text-[var(--color-text-muted)]")}>
            {kind.label}
            {entryTime && <> · {formatClock(entryTime)}</>}
          </span>
        </div>

        {severity != null && (
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              isSymptom ? "text-clay-700" : "text-[var(--color-text-secondary)]"
            )}
          >
            {severity}/10
          </span>
        )}

        {onDelete && (
          <EntryActions
            name={name}
            onDelete={onDelete}
            actions={
              onPatch
                ? [
                    {
                      label: isSymptom ? "Severity or time" : "Change time",
                      icon: isSymptom ? SlidersHorizontal : Clock,
                      onSelect: () => setEditing(true),
                    },
                  ]
                : []
            }
          />
        )}
      </div>

      {editing && onPatch && (
        <EntryEditor
          mode="details"
          entryType={entryType}
          name={name}
          entryTime={entryTime}
          severity={severity}
          onPatch={onPatch}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
