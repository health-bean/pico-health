"use client";

import { useState, useEffect } from "react";
import { Apple, Frown, Pill } from "lucide-react";
import type { EntryType } from "@/types";

interface RecentItem {
  entryType: EntryType;
  name: string;
  count: number;
}

const typeIcons: Record<string, typeof Apple> = {
  food: Apple,
  symptom: Frown,
  supplement: Pill,
  medication: Pill,
};

interface RecentItemsProps {
  onSelect: (entryType: EntryType, name: string) => void;
  selectedNames: Set<string>;
}

export function RecentItems({ onSelect, selectedNames }: RecentItemsProps) {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/entries/recent?days=7");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-500">
        Recent (7 days)
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = typeIcons[item.entryType] ?? Apple;
          const isSelected = selectedNames.has(`${item.entryType}:${item.name}`);

          return (
            <button
              key={`${item.entryType}:${item.name}`}
              onClick={() => onSelect(item.entryType, item.name)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50"
              }`}
              style={{ minHeight: "36px" }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.name}</span>
              <span className="text-xs text-warm-500">{item.count}x</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
