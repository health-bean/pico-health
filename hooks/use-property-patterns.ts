"use client";

import { useEffect, useState } from "react";
import type { PropertyPatternLike } from "@/lib/foods/food-sheet";

/**
 * Insights' "worth keeping an eye on" patterns, for the food panel's "Your
 * log" voice. Fetched once per visit, in the background: the Log never waits
 * for it, and the panel simply leaves "Your log" out until it arrives. Uses
 * the same window the person picked on Insights (default 90 days), so the
 * two screens agree. The server caches the analysis for a few minutes.
 */
let cache: { days: number; promise: Promise<PropertyPatternLike[]> } | null = null;

function chosenDays(): number {
  try {
    const v = Number(localStorage.getItem("pico:insights-range"));
    return v === 30 || v === 90 || v === 180 ? v : 90;
  } catch {
    return 90;
  }
}

function load(days: number): Promise<PropertyPatternLike[]> {
  if (cache && cache.days === days) return cache.promise;
  const promise = fetch(`/api/insights/patterns?days=${days}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { propertyPatterns?: PropertyPatternLike[] } | null) => d?.propertyPatterns ?? [])
    .catch(() => {
      cache = null; // try again next time rather than remembering a failure
      return [];
    });
  cache = { days, promise };
  return promise;
}

export function usePropertyPatterns(enabled: boolean): PropertyPatternLike[] {
  const [patterns, setPatterns] = useState<PropertyPatternLike[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load(chosenDays()).then((p) => alive && setPatterns(p));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return patterns;
}
