"use client";

import { Moon, Sparkles, Activity, Droplets } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DailyExtras {
  meditationPractice?: boolean | null;
  meditationMinutes?: number | null;
  cycleDay?: number | null;
  ovulation?: boolean | null;
  bedtime?: string | null;
  wakeTime?: string | null;
  activityLevel?: "none" | "light" | "moderate" | "vigorous" | null;
}

const ACTIVITY: { value: NonNullable<DailyExtras["activityLevel"]>; label: string }[] = [
  { value: "none", label: "Rest day" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "vigorous", label: "Vigorous" },
];

const MEDITATION_MINUTES = [5, 10, 15, 20, 30, 45];

interface DailyExtrasProps {
  value: DailyExtras;
  onChange: (patch: Partial<DailyExtras>) => void;
  /** Cycle tracking is off for people it does not apply to. */
  showCycle: boolean;
}

const fieldLabel = "text-sm font-medium text-warm-700";
const chip = "min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors";
const chipOff = "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50";
const chipOn = "border-teal-300 bg-teal-50 text-teal-800";
const timeInput =
  "min-h-11 rounded-xl border border-warm-200 bg-[var(--color-surface-card)] px-3 text-base text-warm-900";

/**
 * The parts of a day that are not a 1-10 score: whether you practised, how you
 * slept and moved, where you are in your cycle. These were in Reflect before
 * the March rewrite and are back because the engine can correlate against them.
 */
export function DailyExtrasCard({ value, onChange, showCycle }: DailyExtrasProps) {
  const meditated = value.meditationPractice === true;

  return (
    <Card header="Your day">
      <div className="flex flex-col gap-5">
        {/* Meditation */}
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>
            <Sparkles className="mr-1.5 inline h-4 w-4 text-teal-600" aria-hidden="true" />
            Meditation or breathwork
          </span>
          <div role="group" aria-label="Meditation" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={meditated}
              onClick={() => onChange({ meditationPractice: !meditated, meditationMinutes: meditated ? null : value.meditationMinutes })}
              className={cn(chip, meditated ? chipOn : chipOff)}
            >
              {meditated ? "Practised today" : "Did you practise?"}
            </button>
          </div>
          {meditated && (
            <div role="group" aria-label="Minutes" className="flex flex-wrap gap-2">
              {MEDITATION_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={value.meditationMinutes === m}
                  onClick={() => onChange({ meditationMinutes: value.meditationMinutes === m ? null : m })}
                  className={cn(chip, value.meditationMinutes === m ? chipOn : chipOff)}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sleep window */}
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>
            <Moon className="mr-1.5 inline h-4 w-4 text-teal-600" aria-hidden="true" />
            Sleep
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-warm-600">
              To bed
              <input
                type="time"
                className={timeInput}
                value={value.bedtime ?? ""}
                onChange={(e) => onChange({ bedtime: e.target.value || null })}
                aria-label="Bedtime"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-warm-600">
              Woke
              <input
                type="time"
                className={timeInput}
                value={value.wakeTime ?? ""}
                onChange={(e) => onChange({ wakeTime: e.target.value || null })}
                aria-label="Wake time"
              />
            </label>
          </div>
        </div>

        {/* Activity */}
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>
            <Activity className="mr-1.5 inline h-4 w-4 text-teal-600" aria-hidden="true" />
            Movement
          </span>
          <div role="group" aria-label="Movement" className="flex flex-wrap gap-2">
            {ACTIVITY.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-pressed={value.activityLevel === a.value}
                onClick={() => onChange({ activityLevel: value.activityLevel === a.value ? null : a.value })}
                className={cn(chip, value.activityLevel === a.value ? chipOn : chipOff)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cycle */}
        {showCycle && (
          <div className="flex flex-col gap-2">
            <span className={fieldLabel}>
              <Droplets className="mr-1.5 inline h-4 w-4 text-teal-600" aria-hidden="true" />
              Cycle
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-warm-600">
                Day
                <input
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  className={cn(timeInput, "w-20")}
                  value={value.cycleDay ?? ""}
                  onChange={(e) => onChange({ cycleDay: e.target.value ? Number(e.target.value) : null })}
                  aria-label="Cycle day"
                />
              </label>
              <button
                type="button"
                aria-pressed={value.ovulation === true}
                onClick={() => onChange({ ovulation: value.ovulation === true ? null : true })}
                className={cn(chip, value.ovulation === true ? chipOn : chipOff)}
              >
                Ovulation
              </button>
            </div>
            <p className="text-sm text-warm-500">
              Day 1 is the first day of bleeding. Cycle phase is one of the strongest
              patterns the engine can see, and without it a monthly rhythm looks like food.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
