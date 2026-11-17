"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookHeart } from "lucide-react";
import { daySummary, type DaySummary, type JournalSummaryInput } from "@/lib/reflect/day-summary";

/**
 * The top of a day in the Log: what the person recorded in Reflect, in words.
 * How the day felt on the first line ("Poor sleep · Low energy"), what
 * happened on a quieter second ("Cycle day 10 · Light activity").
 * Renders nothing when Reflect is empty for that day.
 */
export function DayReflectLine({ date, isToday }: { date: string; isToday: boolean }) {
  // Keyed by date so a previous day's line never shows while the next loads.
  const [loaded, setLoaded] = useState<{ date: string; summary: DaySummary } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/journal?date=${date}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entry: JournalSummaryInput | null } | null) => setLoaded({ date, summary: daySummary(d?.entry) }))
      .catch(() => {});
    return () => controller.abort();
  }, [date]);

  const summary = loaded?.date === date ? loaded.summary : null;
  if (!summary || (summary.felt.length === 0 && summary.did.length === 0)) return null;

  const body = (
    <>
      {/* Teal only where it's a link (Today opens Reflect). */}
      <BookHeart className={`mt-0.5 h-4 w-4 shrink-0 ${isToday ? "text-teal-600" : "text-warm-500"}`} aria-hidden="true" />
      <span className="sr-only">From Reflect: </span>
      <span className="flex min-w-0 flex-col">
        {summary.felt.length > 0 && <span className="text-[var(--color-text-secondary)]">{summary.felt.join(" · ")}</span>}
        {summary.did.length > 0 && <span className="text-xs text-[var(--color-text-muted)]">{summary.did.join(" · ")}</span>}
      </span>
    </>
  );

  return isToday ? (
    <Link
      href="/reflect"
      className="mb-3 flex min-h-11 items-start gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-teal-50 transition-colors duration-200"
    >
      {body}
    </Link>
  ) : (
    <p className="mb-3 flex min-h-11 items-start gap-2 px-3 py-1.5 text-sm">{body}</p>
  );
}
