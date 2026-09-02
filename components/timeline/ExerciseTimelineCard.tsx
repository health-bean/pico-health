"use client";

import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Waves,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { EntryActions } from "./EntryActions";
import type { ExerciseType, IntensityLevel } from "@/types";

interface ExerciseTimelineCardProps {
  exerciseType: ExerciseType;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  energyBefore?: number | null;
  energyAfter?: number | null;
  notes?: string | null;
  entryTime?: string | null;
  /** When provided, renders a trailing actions button with Delete. */
  onDelete?: () => void;
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

const INTENSITY_CONFIG: Record<
  IntensityLevel,
  { color: string; bgColor: string; label: string }
> = {
  light: {
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    label: "Light",
  },
  moderate: {
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    label: "Moderate",
  },
  vigorous: {
    color: "text-red-700",
    bgColor: "bg-red-50",
    label: "Vigorous",
  },
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
}: ExerciseTimelineCardProps) {
  const Icon = EXERCISE_ICONS[exerciseType] || Activity;
  const exerciseLabel = EXERCISE_LABELS[exerciseType] || "Exercise";
  const intensityConfig = INTENSITY_CONFIG[intensityLevel];

  const hasEnergyData = energyBefore != null || energyAfter != null;
  const energyChange =
    energyBefore != null && energyAfter != null
      ? energyAfter - energyBefore
      : null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warm-200 bg-[var(--color-surface-card)] px-4 py-3">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-warm-900">
            {exerciseLabel}
          </span>
          <Badge variant="info">Exercise</Badge>
        </div>

        {/* Duration and Intensity */}
        <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-warm-600">
          <span className="font-medium">{durationMinutes} min</span>
          <span className="text-warm-300">•</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
              intensityConfig.bgColor,
              intensityConfig.color
            )}
          >
            {intensityConfig.label}
          </span>
          {entryTime && (
            <>
              <span className="text-warm-300">•</span>
              <span className="text-warm-400">{formatTime(entryTime)}</span>
            </>
          )}
        </div>

        {/* Energy Levels */}
        {hasEnergyData && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <div className="flex items-center gap-1.5">
              {energyBefore != null && (
                <span className="font-medium text-warm-700">
                  {energyBefore}/10
                </span>
              )}
              {energyBefore != null && energyAfter != null && (
                <>
                  <ArrowRight className="h-3 w-3 text-warm-400" />
                  <span className="font-medium text-warm-700">
                    {energyAfter}/10
                  </span>
                  {energyChange !== null && (
                    <span
                      className={cn(
                        "ml-1 font-medium",
                        energyChange > 0
                          ? "text-emerald-600"
                          : energyChange < 0
                            ? "text-red-600"
                            : "text-warm-500"
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

      {onDelete && <EntryActions name={exerciseLabel} onDelete={onDelete} />}
    </div>
  );
}
