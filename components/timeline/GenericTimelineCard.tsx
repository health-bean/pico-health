"use client";

import { useState } from "react";
import { SlidersHorizontal, Clock, type LucideIcon } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui";
import { EntryActions } from "./EntryActions";
import { EntryEditor, type EntryPatch } from "./EntryEditor";
import type { EntryType } from "@/types";

interface GenericTimelineCardProps {
  entryType: EntryType;
  name: string;
  icon: LucideIcon;
  label: string;
  variant: BadgeVariant;
  entryTime?: string | null;
  severity?: number | null;
  onDelete?: () => void;
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
}

function formatTime(time: string | null | undefined): string {
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
 * Timeline card for every entry type without a dedicated card (symptom,
 * supplement, medication, exposure, detox, energy, off-protocol).
 */
export function GenericTimelineCard({
  entryType,
  name,
  icon: Icon,
  label,
  variant,
  entryTime,
  severity,
  onDelete,
  onPatch,
}: GenericTimelineCardProps) {
  const [editing, setEditing] = useState(false);
  const isSymptom = entryType === "symptom";

  return (
    <div className="flex flex-col rounded-xl bg-[var(--color-surface-card)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {name}
            </span>
            <Badge variant={variant}>{label}</Badge>
          </div>
          {entryTime && (
            <p className="text-xs text-[var(--color-text-muted)]">{formatTime(entryTime)}</p>
          )}
        </div>

        {severity != null && (
          <span className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
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
