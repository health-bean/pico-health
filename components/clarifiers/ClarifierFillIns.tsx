"use client";

import { useEffect, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Card } from "@/components/ui";
import { ClarifierRow } from "./ClarifierRow";
import type { Clarifier } from "@/lib/clarifiers/types";

/**
 * Reflect's "fill in the blanks": up to three open clarifier questions for
 * the day. Renders nothing when there is nothing to ask.
 */
export function ClarifierFillIns({ date }: { date: string }) {
  // Keyed by date so switching days clears the list without a sync setState.
  const [state, setState] = useState<{ date: string; items: Clarifier[] }>({ date, items: [] });
  const items = state.date === date ? state.items : [];
  const setItems = (update: (prev: Clarifier[]) => Clarifier[]) =>
    setState((prev) => ({ date, items: update(prev.date === date ? prev.items : []) }));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clarifiers/pending?date=${date}`)
      .then((r) => (r.ok ? r.json() : { clarifiers: [] }))
      .then((data: { clarifiers?: Clarifier[] }) => {
        if (!cancelled) setState({ date, items: data.clarifiers ?? [] });
      })
      .catch(() => {
        /* silent — this section is optional */
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (items.length === 0) return null;

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <MessageCircleQuestion className="h-4 w-4 text-warm-500" aria-hidden />
        <span className="text-sm font-medium text-warm-700">A few details from today</span>
      </div>
      <p className="mb-3 text-xs text-warm-500">
        Optional — each one sharpens what Insights can see. Skip anything you don&rsquo;t know.
      </p>
      <div className="flex flex-col gap-2">
        {items.map((c) => (
          <ClarifierRow
            key={`${c.entryId}:${c.dimension}`}
            clarifier={c}
            onDone={({ entryId, dimension }) =>
              setItems((prev) => prev.filter((x) => !(x.entryId === entryId && x.dimension === dimension)))
            }
          />
        ))}
      </div>
    </Card>
  );
}
