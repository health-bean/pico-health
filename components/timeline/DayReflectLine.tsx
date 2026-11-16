"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookHeart } from "lucide-react";
import { daySummaryParts, type JournalSummaryInput } from "@/lib/reflect/day-summary";

/**
 * One quiet line at the top of a day in the Log: what the person recorded in
 * Reflect (sleep, energy, cycle day…), so the Log shows the whole day.
 * Renders nothing when Reflect is empty for that day.
 */
export function DayReflectLine({ date, isToday }: { date: string; isToday: boolean }) {
  // Keyed by date so a previous day's line never shows while the next loads.
  const [loaded, setLoaded] = useState<{ date: string; parts: string[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/journal?date=${date}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entry: JournalSummaryInput | null } | null) => setLoaded({ date, parts: daySummaryParts(d?.entry) }))
      .catch(() => {});
    return () => controller.abort();
  }, [date]);

  const parts = loaded?.date === date ? loaded.parts : [];
  if (parts.length === 0) return null;

  const body = (
    <>
      <BookHeart className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
      <span className="sr-only">From Reflect: </span>
      <span>{parts.join(" · ")}</span>
    </>
  );

  return isToday ? (
    <Link
      href="/reflect"
      className="mb-3 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-[var(--color-text-secondary)] hover:bg-teal-50 hover:text-teal-700 transition-colors duration-200"
    >
      {body}
    </Link>
  ) : (
    <p className="mb-3 flex min-h-11 items-center gap-2 px-3 text-sm text-[var(--color-text-secondary)]">{body}</p>
  );
}
