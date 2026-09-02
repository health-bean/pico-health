"use client";

import { useState, useCallback } from "react";
import type { EntryType } from "@/types";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type WhenMode = "now" | "earlier" | "yesterday";

export interface QuickLogWhen {
  mode: WhenMode;
  /** HH:MM (24h). Used for "earlier" and "yesterday". */
  time: string;
}

export interface QuickLogItem {
  id: string; // temp client ID
  entryType: EntryType;
  name: string;
  severity?: number;
  /** Curated / USDA food id (FK to foods.id) */
  foodId?: string;
  /** User-created food id (custom_foods.id) — stored in structuredContent */
  customFoodId?: string;
}

export interface AddItemOptions {
  foodId?: string;
  customFoodId?: string;
}

const DEFAULT_SEVERITY = 5;

interface UseQuickLogReturn {
  items: QuickLogItem[];
  addItem: (entryType: EntryType, name: string, opts?: AddItemOptions) => void;
  removeItem: (id: string) => void;
  updateSeverity: (id: string, severity: number) => void;
  mealType: MealType | null;
  setMealType: (mealType: MealType | null) => void;
  when: QuickLogWhen;
  setWhen: (when: QuickLogWhen) => void;
  submitAll: () => Promise<boolean>;
  submitting: boolean;
  clear: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local wall-clock time as HH:MM. */
export function localTimeString(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Resolve the "when" chip selection into an entryDate + entryTime pair. */
export function resolveWhen(
  when: QuickLogWhen,
  now: Date = new Date()
): { entryDate: string; entryTime: string } {
  if (when.mode === "now") {
    return { entryDate: localDateString(now), entryTime: localTimeString(now) };
  }
  const date = new Date(now);
  if (when.mode === "yesterday") date.setDate(date.getDate() - 1);
  const time = /^\d{2}:\d{2}$/.test(when.time) ? when.time : localTimeString(now);
  return { entryDate: localDateString(date), entryTime: time };
}

export function useQuickLog(): UseQuickLogReturn {
  const [items, setItems] = useState<QuickLogItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [when, setWhen] = useState<QuickLogWhen>(() => ({
    mode: "now",
    time: localTimeString(new Date()),
  }));

  const addItem = useCallback(
    (entryType: EntryType, name: string, opts?: AddItemOptions) => {
      // Prevent duplicates
      setItems((prev) => {
        const exists = prev.some(
          (i) => i.entryType === entryType && i.name === name
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            entryType,
            name,
            // Default matches what the picker displays (5/10)
            severity: entryType === "symptom" ? DEFAULT_SEVERITY : undefined,
            foodId: opts?.foodId,
            customFoodId: opts?.customFoodId,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateSeverity = useCallback((id: string, severity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, severity } : i))
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const submitAll = useCallback(async () => {
    if (items.length === 0) return false;
    setSubmitting(true);

    try {
      const { entryDate, entryTime } = resolveWhen(when);
      let timezone: string | undefined;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        timezone = undefined;
      }

      const entries = items.map((item) => {
        const isFood = item.entryType === "food";
        return {
          entryType: item.entryType,
          name: item.name,
          severity: item.severity,
          entryDate,
          entryTime,
          timezone,
          foodId: isFood ? item.foodId : undefined,
          mealType: isFood && mealType ? mealType : undefined,
          structuredContent:
            isFood && item.customFoodId
              ? { customFoodId: item.customFoodId, source: "custom" }
              : undefined,
        };
      });

      const res = await fetch("/api/entries/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      if (res.ok) {
        setItems([]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to submit quick log:", err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [items, mealType, when]);

  return {
    items,
    addItem,
    removeItem,
    updateSeverity,
    mealType,
    setMealType,
    when,
    setWhen,
    submitAll,
    submitting,
    clear,
  };
}
