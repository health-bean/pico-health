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
import { severityWord } from "@/lib/capture/symptom-now";
import { EntryActions } from "./EntryActions";
import { EntryEditor, type EntryPatch } from "./EntryEditor";
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
/** Icons are grey; symptoms are the one kind that carries colour (clay). */
const KIND: Record<Exclude<EntryType, "food" | "exercise">, { icon: LucideIcon; label: string }> = {
  symptom: { icon: Frown, label: "Symptom" },
  supplement: { icon: Pill, label: "Supplement" },
  medication: { icon: Pill, label: "Medication" },
  exposure: { icon: ShieldAlert, label: "Exposure" },
  detox: { icon: Droplets, label: "Detox" },
  energy: { icon: Zap, label: "Energy" },
  off_protocol: { icon: AlertTriangle, label: "Off-protocol" },
};

const FALLBACK = { icon: Activity, label: "Entry" };

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
    <div className="flex flex-col">
      <div className="flex min-h-11 items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isSymptom ? "text-clay-600" : "text-warm-500")} aria-hidden="true" />

        {/* The time sits in the timeline's own column, so the row says only what and how bad. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]">{name}</span>
          <span className={cn("text-xs", isSymptom ? "text-clay-700" : "text-[var(--color-text-muted)]")}>
            {kind.label}
          </span>
        </div>

        {severity != null && (
          <span
            className={cn(
              "shrink-0 pt-0.5 text-sm font-semibold",
              isSymptom ? "text-clay-700" : "text-[var(--color-text-secondary)]"
            )}
          >
            {severityWord(severity)}
            <span className="sr-only"> ({severity} out of 10)</span>
          </span>
        )}

        {onDelete && (
          <div className="-my-2.5">
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
          </div>
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
