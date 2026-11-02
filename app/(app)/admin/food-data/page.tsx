"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, Search } from "lucide-react";
import { EmptyState, Input, useToast } from "@/components/ui";
import { RatingBadge } from "@/components/admin/rating-badge";
import { cn } from "@/lib/utils";
import type { RatingResult } from "@/lib/food-data/compute";
import { FLAG_LABELS } from "@/lib/food-data/labels";
import { PROPERTY_LABELS, type FoodProperty } from "@/lib/sources/properties";

interface Item {
  foodId: string;
  foodName: string;
  property: FoodProperty;
  total: number;
  result: RatingResult;
}

interface FoodHit {
  id: string;
  displayName: string;
}

type Filter = "needs_review" | "one_test" | "all";

const FILTERS: { key: Filter; label: string; match: (i: Item) => boolean }[] = [
  { key: "needs_review", label: "Studies disagree", match: (i) => i.result.needsReview },
  { key: "one_test", label: "One test only", match: (i) => i.result.flags.includes("one_test") },
  { key: "all", label: "All rated", match: () => true },
];

export default function FoodDataPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("needs_review");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/food-data")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => !cancelled && setItems(data.items))
      .catch(() => !cancelled && toast("Could not load food data", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Find any food to add lab results to, including foods with none yet.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/admin/foods?search=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { foods: [] }))
        .then((data) => !cancelled && setHits((data.foods ?? []).slice(0, 8)))
        .catch(() => !cancelled && setHits([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter(f.match).length])),
    [items]
  );
  const shown = items.filter(FILTERS.find((f) => f.key === filter)!.match);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-warm-900">
          Food data
        </h1>
        <p className="text-sm text-warm-500">
          Lab results behind each rating. Ratings use the middle value of the counted results; you
          decide when studies disagree.
        </p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Input
          id="food-search"
          aria-label="Find a food to add lab results to"
          placeholder="Find a food to add lab results to…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Search className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-warm-400" aria-hidden="true" />
        {query.trim().length >= 2 && hits.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-warm-200 bg-[var(--color-surface-card)] shadow-[var(--shadow-elevated)]">
            {hits.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/food-data/${f.id}`}
                  className="block min-h-11 px-4 py-2.5 text-sm text-warm-800 hover:bg-teal-50"
                >
                  {f.displayName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-warm-100 p-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-[var(--color-surface-card)] text-warm-900 shadow-[var(--shadow-card)]"
                : "text-warm-500 hover:text-warm-700"
            )}
          >
            {f.label} <span className="tabular-nums text-warm-400">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-500" aria-label="Loading" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-6 w-6" aria-hidden="true" />}
          title={items.length === 0 ? "No lab results yet" : "Nothing here"}
          description={
            items.length === 0
              ? "Find a food above and add its first lab result."
              : "No food in this list right now."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-warm-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-warm-50 text-xs uppercase tracking-wide text-warm-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Food</th>
                <th className="px-4 py-2.5 font-medium">Property</th>
                <th className="px-4 py-2.5 font-medium">Rating</th>
                <th className="px-4 py-2.5 font-medium">Results</th>
                <th className="px-4 py-2.5 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {shown.map((i) => (
                <tr key={`${i.foodId}:${i.property}`} className="hover:bg-warm-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/food-data/${i.foodId}`} className="font-medium text-teal-700 hover:underline">
                      {i.foodName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-warm-700">{PROPERTY_LABELS[i.property]}</td>
                  <td className="px-4 py-3">
                    <RatingBadge result={i.result} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-warm-600">
                    {i.result.counted} of {i.total}
                  </td>
                  <td className="px-4 py-3 text-warm-600">
                    {i.result.flags.map((f) => FLAG_LABELS[f]).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
