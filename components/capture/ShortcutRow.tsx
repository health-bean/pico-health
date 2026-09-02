"use client";

import { useEffect, useState } from "react";
import { History, Repeat } from "lucide-react";
import type { EntryType } from "@/types";

interface ShortcutItem {
  entryType: string;
  name: string;
  foodId?: string;
  mealType?: string;
}

interface Shortcut {
  key: string;
  label: string;
  icon: typeof Repeat;
  items: ShortcutItem[];
}

interface ShortcutRowProps {
  onShortcut: (items: ShortcutItem[]) => void;
}

function currentMeal(): string {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 17) return "snack";
  return "dinner";
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Recognition over recall: when the capture field focuses, offer yesterday's
 * same meal and the user's own frequent items as one-tap logs.
 */
export function ShortcutRow({ onShortcut }: ShortcutRowProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meal = currentMeal();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const found: Shortcut[] = [];

      try {
        const res = await fetch(`/api/entries?date=${localDateString(yesterday)}`);
        if (res.ok) {
          const data = await res.json();
          const entries: {
            entryType: EntryType;
            name: string;
            foodId?: string | null;
            mealType?: string | null;
          }[] = data.entries ?? [];
          const sameMeal = entries.filter(
            (e) => e.entryType === "food" && e.mealType === meal
          );
          if (sameMeal.length > 0) {
            found.push({
              key: "yesterday-meal",
              label: `Same as yesterday's ${meal} (${sameMeal
                .map((e) => e.name)
                .slice(0, 3)
                .join(", ")}${sameMeal.length > 3 ? "…" : ""})`,
              icon: Repeat,
              items: sameMeal.map((e) => ({
                entryType: "food",
                name: e.name,
                foodId: e.foodId ?? undefined,
                mealType: meal,
              })),
            });
          }
        }
      } catch {
        // shortcuts are a convenience; fail silent
      }

      try {
        const res = await fetch("/api/entries/recent?days=7");
        if (res.ok) {
          const data = await res.json();
          const items: { entryType: string; name: string; count: number }[] =
            data.items ?? [];
          for (const item of items.slice(0, 4)) {
            found.push({
              key: `recent-${item.entryType}-${item.name}`,
              label: item.name,
              icon: History,
              items: [{ entryType: item.entryType, name: item.name }],
            });
          }
        }
      } catch {
        // fail silent
      }

      if (!cancelled) setShortcuts(found);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (shortcuts.length === 0) return null;

  return (
    <div
      className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="listbox"
      aria-label="Quick log shortcuts"
    >
      {shortcuts.map((s) => (
        <button
          key={s.key}
          type="button"
          // onMouseDown so the tap wins the race against the input's blur.
          onMouseDown={(e) => {
            e.preventDefault();
            onShortcut(s.items);
          }}
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface-card)] px-3 text-xs font-medium text-warm-700 shadow-sm transition-colors hover:border-teal-300 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          <s.icon className="h-3.5 w-3.5 text-teal-600" aria-hidden />
          <span className="max-w-64 truncate">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
