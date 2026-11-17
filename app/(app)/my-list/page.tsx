"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";
import { Card, EmptyState, Input, PageTitle, Spinner } from "@/components/ui";
import type { ListGroup, ListItem, MyList } from "@/lib/personal/my-list";
import { FIT_TONE_CLASS } from "@/lib/protocols/fit-line";
import { FitSymbol } from "@/components/foods/FitSymbol";
import { cn } from "@/lib/utils";

const GROUPS: { key: ListGroup; title: (diet: string | null) => string; open: boolean }[] = [
  { key: "avoid", title: (d) => (d ? `Avoid on ${d}` : "Not for you"), open: true },
  { key: "limit", title: (d) => (d ? `Limit on ${d}` : "Small amounts"), open: true },
  { key: "allowed", title: (d) => (d ? `Allowed on ${d}` : "Fine for you"), open: false },
  { key: "unknown", title: (d) => `Not rated yet for ${d ?? "your diet"}`, open: false },
];

/** "passed reintroduction" / "your rating" mark a personal verdict; show it in the group's tone. */
function Row({ item, group }: { item: ListItem; group: ListGroup }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm text-warm-900">{item.name}</span>
      {item.reason && (
        <span className={cn("text-right text-xs", item.personal ? cn("font-medium", FIT_TONE_CLASS[group].text) : "text-warm-500")}>
          {item.personal && item.reason === "your rating" ? "You marked this" : item.reason}
        </span>
      )}
    </li>
  );
}

/**
 * My list: the person's diet as a list (what they're used to from handouts),
 * with their own results on top. Built from the same ratings as the Log, so
 * the two never disagree.
 */
export default function MyListPage() {
  const [data, setData] = useState<MyList | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/foods/my-list")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = query.trim().toLowerCase();
    const out = {} as MyList["groups"];
    for (const g of GROUPS) out[g.key] = data.groups[g.key].filter((i) => !q || i.name.toLowerCase().includes(q));
    return out;
  }, [data, query]);

  const mine = data
    ? Object.values(data.groups).flat().filter((i) => i.personal).length
    : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/settings" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-warm-600 hover:text-warm-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Settings
      </Link>
      <PageTitle>My food list</PageTitle>
      <p className="mt-1 text-sm text-warm-600">
        {data?.diet
          ? `What ${data.diet} says about each food, with your own results on top.`
          : "Foods you've rated for yourself."}{" "}
        {mine > 0 && `${mine} ${mine === 1 ? "food has" : "foods have"} your own rating.`}
      </p>

      {failed && <p className="mt-6 text-sm text-brick-600">Couldn&apos;t load your list. Try again.</p>}
      {!data && !failed && (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      )}

      {data && filtered && (
        <>
          {!data.diet && mine === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<ListChecks className="h-6 w-6 text-teal-600" aria-hidden="true" />}
                title="Nothing on your list yet"
                description="Open any food in your Log and tap “Fine for me”, “Small amounts” or “Not for me”. Set a diet in Settings to see what fits it."
              />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <Input
                  type="search"
                  aria-label="Find a food"
                  placeholder="Find a food"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {GROUPS.filter((g) => filtered[g.key].length > 0).map((g) => (
                  <Card key={g.key}>
                    <details open={g.open || query.length > 0}>
                      <summary className={cn("flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold", FIT_TONE_CLASS[g.key].text)}>
                        <span className="inline-flex items-center gap-1.5">
                          <FitSymbol tone={g.key} className="h-3.5 w-3.5" />
                          {g.title(data.diet)}
                        </span>
                        <span className="text-xs font-normal text-warm-500">{filtered[g.key].length}</span>
                      </summary>
                      <ul className="divide-y divide-warm-100">
                        {filtered[g.key].map((i) => (
                          <Row key={i.foodId} item={i} group={g.key} />
                        ))}
                      </ul>
                    </details>
                  </Card>
                ))}
              </div>
              {!data.diet && (
                <p className="mt-4 text-sm text-warm-500">
                  Following a diet? <Link href="/settings" className="font-medium text-teal-700 hover:text-teal-800">Set it in Settings</Link> to see what fits.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
