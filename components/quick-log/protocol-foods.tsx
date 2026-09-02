"use client";

import { useState, useEffect } from "react";
import { Apple, Check } from "lucide-react";
import type { EntryType } from "@/types";

interface ProtocolFood {
  id: string;
  displayName: string;
  categoryName: string;
  subcategoryName: string;
  protocolStatus: string | null;
}

interface ProtocolFoodsProps {
  protocolId: string | null;
  onSelect: (entryType: EntryType, name: string, foodId?: string) => void;
  selectedNames: Set<string>;
}

// /api/foods/search is a trigram similarity search (min 2 chars, max 10
// results, no wildcard), so we seed it with a handful of staple queries and
// merge the results to build a "common foods" list.
const STAPLE_QUERIES = [
  "chicken",
  "salmon",
  "beef",
  "egg",
  "rice",
  "spinach",
  "broccoli",
  "carrot",
  "apple",
  "banana",
];

export function ProtocolFoods({
  protocolId,
  onSelect,
  selectedNames,
}: ProtocolFoodsProps) {
  const [foods, setFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!protocolId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Get common foods with protocol status
        const responses = await Promise.all(
          STAPLE_QUERIES.map((q) => {
            const params = new URLSearchParams({
              query: q,
              limit: "5",
              protocolId: protocolId as string,
            });
            return fetch(`/api/foods/search?${params.toString()}`)
              .then((res) => (res.ok ? res.json() : { foods: [] }))
              .catch(() => ({ foods: [] }));
          })
        );

        // Merge, dedupe by id, filter to allowed foods only
        const seen = new Set<string>();
        const allowed: ProtocolFood[] = [];
        for (const data of responses) {
          for (const f of (data.foods ?? []) as ProtocolFood[]) {
            if (seen.has(f.id)) continue;
            seen.add(f.id);
            if (f.protocolStatus === "allowed" || f.protocolStatus === null) {
              allowed.push(f);
            }
          }
        }
        setFoods(allowed);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [protocolId]);

  if (loading || !protocolId || foods.length === 0) return null;

  // Group by category
  const byCategory = foods.reduce<Record<string, ProtocolFood[]>>(
    (acc, food) => {
      const cat = food.categoryName;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(food);
      return acc;
    },
    {}
  );

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-400">
        Protocol Foods
      </h3>
      <div className="flex flex-col gap-3">
        {Object.entries(byCategory).map(([category, catFoods]) => (
          <div key={category}>
            <p className="mb-1.5 text-xs font-medium text-warm-500">
              {category}
            </p>
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {catFoods.map((food) => {
                const isSelected = selectedNames.has(
                  `food:${food.displayName}`
                );
                return (
                  <button
                    key={food.id}
                    onClick={() => onSelect("food", food.displayName, food.id)}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Apple className="h-3.5 w-3.5" />
                    )}
                    {food.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
