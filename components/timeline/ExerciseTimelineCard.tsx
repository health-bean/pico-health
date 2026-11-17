"use client";

import { useState } from "react";
import {
  Activity,
  Bike,
  Clock,
  Dumbbell,
  Footprints,
  Waves,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntryActions } from "./EntryActions";
import { EntryEditor, type EntryPatch } from "./EntryEditor";
import type { ExerciseType, IntensityLevel } from "@/types";

interface ExerciseTimelineCardProps {
  exerciseType: ExerciseType;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  energyBefore?: number | null;
  energyAfter?: number | null;
  notes?: string | null;
  entryTime?: string | null;
  /** When provided, renders a trailing actions menu with Delete. */
  onDelete?: () => void;
  /** When provided alongside onDelete, the menu also offers a time edit. */
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
}

const EXERCISE_ICONS: Record<ExerciseType, typeof Activity> = {
  walking: Footprints,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  yoga: Activity,
  strength_training: Dumbbell,
  stretching: Activity,
  sports: Activity,
  other: Activity,
};

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  walking: "Walking",
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  yoga: "Yoga",
  strength_training: "Strength Training",
  stretching: "Stretching",
  sports: "Sports",
  other: "Exercise",
};

/** Intensity is a fact, not a verdict: words in ink, never coloured. */
const INTENSITY_LABEL: Record<IntensityLevel, string> = {
  light: "Light",
  moderate: "Moderate",
  vigorous: "Vigorous",
};

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

export function ExerciseTimelineCard({
  exerciseType,
  durationMinutes,
  intensityLevel,
  energyBefore,
  energyAfter,
  notes,
  entryTime,
  onDelete,
  onPatch,
}: ExerciseTimelineCardProps) {
  const [editing, setEditing] = useState(false);
  const Icon = EXERCISE_ICONS[exerciseType] || Activity;
  const exerciseLabel = EXERCISE_LABELS[exerciseType] || "Exercise";
  const intensity = INTENSITY_LABEL[intensityLevel] ?? "";

  const hasEnergyData = energyBefore != null || energyAfter != null;
  const energyChange =
    energyBefore != null && energyAfter != null
      ? energyAfter - energyBefore
      : null;

  return (
    <div className="flex flex-col">
    <div className="flex min-h-11 items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-semibold text-warm-900">
            {exerciseLabel}
          </span>
        </div>

        {/* Duration and intensity; the time is in the timeline's own column. */}
        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Exercise · {durationMinutes} min{intensity ? ` · ${intensity}` : ""}
        </div>

        {/* Energy Levels */}
        {hasEnergyData && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Zap className="h-3.5 w-3.5 text-warm-500" aria-hidden="true" />
            <div className="flex items-center gap-1.5">
              {energyBefore != null && (
                <span className="font-medium text-warm-700">
                  {energyBefore}/10
                </span>
              )}
              {energyBefore != null && energyAfter != null && (
                <>
                  <ArrowRight className="h-3 w-3 text-warm-500" />
                  <span className="font-medium text-warm-700">
                    {energyAfter}/10
                  </span>
                  {energyChange !== null && (
                    <span
                      className={cn(
                        "ml-1 font-medium",
                        "text-warm-600"
                      )}
                    >
                      ({energyChange > 0 ? "+" : ""}
                      {energyChange})
                    </span>
                  )}
                </>
              )}
              {energyBefore == null && energyAfter != null && (
                <span className="font-medium text-warm-700">
                  After: {energyAfter}/10
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <p className="mt-2 text-xs text-warm-500 line-clamp-2">{notes}</p>
        )}
      </div>

      {onDelete && (
        <EntryActions
          name={exerciseLabel}
          onDelete={onDelete}
          actions={
            onPatch ? [{ label: "Change time", icon: Clock, onSelect: () => setEditing(true) }] : []
          }
        />
      )}
    </div>

      {editing && onPatch && (
        <EntryEditor
          mode="details"
          entryType="exercise"
          name={exerciseLabel}
          entryTime={entryTime}
          onPatch={onPatch}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
