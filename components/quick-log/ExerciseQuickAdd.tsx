"use client";

import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { ExerciseType, IntensityLevel } from "@/types";

interface ExerciseQuickAddProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ExerciseFormData {
  exerciseType: ExerciseType;
  durationMinutes: string;
  intensityLevel: IntensityLevel;
  energyBefore: string;
  energyAfter: string;
  notes: string;
}

const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "yoga", label: "Yoga" },
  { value: "strength_training", label: "Strength Training" },
  { value: "stretching", label: "Stretching" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

const INTENSITY_LEVELS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Easy pace, can talk easily" },
  { value: "moderate", label: "Moderate", description: "Comfortable pace, can hold conversation" },
  { value: "vigorous", label: "Vigorous", description: "Hard pace, difficult to talk" },
];

export function ExerciseQuickAdd({ onSuccess, onCancel }: ExerciseQuickAddProps) {
  const [formData, setFormData] = useState<ExerciseFormData>({
    exerciseType: "walking",
    durationMinutes: "",
    intensityLevel: "moderate",
    energyBefore: "",
    energyAfter: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExerciseFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof ExerciseFormData, string>> = {};

    if (!formData.durationMinutes) {
      newErrors.durationMinutes = "Duration is required";
    } else {
      const duration = parseInt(formData.durationMinutes, 10);
      if (isNaN(duration) || duration <= 0) {
        newErrors.durationMinutes = "Duration must be a positive number";
      }
    }

    if (formData.energyBefore) {
      const energy = parseInt(formData.energyBefore, 10);
      if (isNaN(energy) || energy < 1 || energy > 10) {
        newErrors.energyBefore = "Energy must be between 1 and 10";
      }
    }

    if (formData.energyAfter) {
      const energy = parseInt(formData.energyAfter, 10);
      if (isNaN(energy) || energy < 1 || energy > 10) {
        newErrors.energyAfter = "Energy must be between 1 and 10";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const now = new Date();
      const entryDate = now.toISOString().split("T")[0];
      const entryTime = now.toTimeString().split(" ")[0];

      const payload: Record<string, unknown> = {
        entryType: "exercise",
        name: EXERCISE_TYPES.find((t) => t.value === formData.exerciseType)?.label || formData.exerciseType,
        exerciseType: formData.exerciseType,
        durationMinutes: parseInt(formData.durationMinutes, 10),
        intensityLevel: formData.intensityLevel,
        entryDate,
        entryTime,
      };

      if (formData.energyBefore) {
        payload.energyLevel = parseInt(formData.energyBefore, 10);
      }

      if (formData.notes) {
        payload.structuredContent = { notes: formData.notes };
      }

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save exercise entry");
      }

      // If energyAfter is provided, create a separate energy level entry
      if (formData.energyAfter) {
        const energyPayload = {
          entryType: "energy",
          name: "Energy Level",
          energyLevel: parseInt(formData.energyAfter, 10),
          entryDate,
          entryTime,
          structuredContent: { 
            type: "energy_after_exercise",
            exerciseType: formData.exerciseType,
          },
        };

        await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(energyPayload),
        });
      }

      setSuccess(true);
      setFormData({
        exerciseType: "walking",
        durationMinutes: "",
        intensityLevel: "moderate",
        energyBefore: "",
        energyAfter: "",
        notes: "",
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error("Error submitting exercise:", error);
      setErrors({
        durationMinutes: error instanceof Error ? error.message : "Failed to save exercise",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field: keyof ExerciseFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <Activity className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-emerald-800">Exercise logged successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Exercise Type */}
      <div>
        <label htmlFor="exerciseType" className="mb-1.5 block text-sm font-medium text-warm-700">
          Exercise Type <span className="text-red-500">*</span>
        </label>
        <select
          id="exerciseType"
          value={formData.exerciseType}
          onChange={(e) => handleChange("exerciseType", e.target.value)}
          className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {EXERCISE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration" className="mb-1.5 block text-sm font-medium text-warm-700">
          Duration (minutes) <span className="text-red-500">*</span>
        </label>
        <input
          id="duration"
          type="number"
          min="1"
          value={formData.durationMinutes}
          onChange={(e) => handleChange("durationMinutes", e.target.value)}
          placeholder="30"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
            errors.durationMinutes
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-warm-200 focus:border-teal-500 focus:ring-teal-500"
          }`}
        />
        {errors.durationMinutes && (
          <p className="mt-1 text-xs text-red-600">{errors.durationMinutes}</p>
        )}
      </div>

      {/* Intensity Level */}
      <div>
        <label className="mb-2 block text-sm font-medium text-warm-700">
          Intensity <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {INTENSITY_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                formData.intensityLevel === level.value
                  ? "border-teal-300 bg-teal-50"
                  : "border-warm-200 bg-[var(--color-surface-card)] hover:bg-warm-50"
              }`}
            >
              <input
                type="radio"
                name="intensity"
                value={level.value}
                checked={formData.intensityLevel === level.value}
                onChange={(e) => handleChange("intensityLevel", e.target.value)}
                className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-warm-900">{level.label}</div>
                <div className="text-xs text-warm-500">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Energy Before (Optional) */}
      <div>
        <label htmlFor="energyBefore" className="mb-1.5 block text-sm font-medium text-warm-700">
          Energy Before (1-10, optional)
        </label>
        <input
          id="energyBefore"
          type="number"
          min="1"
          max="10"
          value={formData.energyBefore}
          onChange={(e) => handleChange("energyBefore", e.target.value)}
          placeholder="5"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
            errors.energyBefore
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-warm-200 focus:border-teal-500 focus:ring-teal-500"
          }`}
        />
        {errors.energyBefore && (
          <p className="mt-1 text-xs text-red-600">{errors.energyBefore}</p>
        )}
      </div>

      {/* Energy After (Optional) */}
      <div>
        <label htmlFor="energyAfter" className="mb-1.5 block text-sm font-medium text-warm-700">
          Energy After (1-10, optional)
        </label>
        <input
          id="energyAfter"
          type="number"
          min="1"
          max="10"
          value={formData.energyAfter}
          onChange={(e) => handleChange("energyAfter", e.target.value)}
          placeholder="7"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
            errors.energyAfter
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-warm-200 focus:border-teal-500 focus:ring-teal-500"
          }`}
        />
        {errors.energyAfter && (
          <p className="mt-1 text-xs text-red-600">{errors.energyAfter}</p>
        )}
      </div>

      {/* Notes (Optional) */}
      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-warm-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="How did you feel? Any observations..."
          rows={3}
          className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          loading={submitting}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Log Exercise"
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
