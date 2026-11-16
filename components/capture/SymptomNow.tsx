"use client";

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  pickCheckinMeal,
  startedAt,
  topSymptoms,
  SEVERITY,
  STARTED_OPTIONS,
  type CheckinMeal,
  type LoggedEntry,
} from "@/lib/capture/symptom-now";

interface SymptomNowProps {
  /** Today's entries, as the Log shows them. */
  entries: LoggedEntry[];
  /** YYYY-MM-DD of the day shown. */
  date: string;
  /** Today offers meal check-ins and "started" times; a past day logs without a time. */
  isToday: boolean;
  /** "Yesterday", "Mon, Nov 10": used in the heading on past days. */
  dayLabel: string;
  /** Refetch the day after anything is logged, changed or undone. */
  onChanged: () => void;
  /** "Something else": hand over to the capture field. */
  onSomethingElse: () => void;
}

interface Logged {
  id: string;
  name: string;
  started: number;
  severity: keyof typeof SEVERITY | null;
}

const ANSWERED_KEY = (date: string, time: string) => `pico:checkin:${date}:${time}`;
/** The confirm panel closes itself once it has been left alone this long. */
const IDLE_MS = 12_000;

function nowHHMMSS(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

function isAnswered(date: string, time: string): boolean {
  try {
    return localStorage.getItem(ANSWERED_KEY(date, time)) === "1";
  } catch {
    return false;
  }
}

function markAnswered(date: string, time: string, answer: "fine" | "symptom") {
  try {
    localStorage.setItem(ANSWERED_KEY(date, time), "1");
  } catch {
    // storage unavailable: the server copy below still holds the answer
  }
  // Stored on the meal itself: "fine" is a watched meal with no reaction,
  // which an unanswered meal can't be told apart from. Best effort.
  void fetch("/api/entries/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryDate: date, mealTime: time, answer }),
  }).catch(() => null);
}

/**
 * Compact chips: a 36px face inside a 44px tap target. The button is the
 * target (transparent, full height); the inner span is what you see.
 */
const chipButton = "group inline-flex min-h-11 items-center focus-visible:outline-none disabled:opacity-60";
const chipFace =
  "inline-flex h-9 items-center gap-1 rounded-sm border px-2.5 text-sm font-medium transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-teal-500";
const chipIdle =
  "border-[var(--color-border)] bg-[var(--color-surface-card)] text-warm-900 group-hover:border-teal-300 group-hover:text-teal-700";
const chipOn = "border-teal-700 bg-teal-700 text-white";
const chipAdd = "border-dashed border-teal-400 bg-transparent font-semibold text-teal-700 group-hover:bg-teal-50";

function Chip({
  children,
  tone = "idle",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "idle" | "on" | "add" }) {
  return (
    <button type="button" className={cn(chipButton, className)} {...props}>
      <span className={cn(chipFace, tone === "on" ? chipOn : tone === "add" ? chipAdd : chipIdle)}>{children}</span>
    </button>
  );
}

/**
 * In-the-moment symptom logging, at the top of today. Timing is what lets a
 * strong reaction show in two to three weeks rather than months, and it only
 * works when a symptom is logged close to when it starts — so the first
 * thing on Log is a one-tap way to say how you feel.
 *
 * 90 minutes to 4 hours after a meal with nothing logged since, the row
 * becomes a check-in about that meal instead. A tap saves at once with Undo;
 * the panel that follows offers when it started and how bad, both optional.
 */
export function SymptomNow({ entries, date, isToday, dayLabel, onChanged, onSomethingElse }: SymptomNowProps) {
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [logged, setLogged] = useState<Logged | null>(null);
  const [checkin, setCheckin] = useState<CheckinMeal | null>(null);
  const [busy, setBusy] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/entries/recent?days=14")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => !cancelled && setSymptoms(topSymptoms(d.items ?? [])))
      .catch(() => !cancelled && setSymptoms(topSymptoms([])));
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-evaluate the check-in as entries change and as time passes.
  useEffect(() => {
    // Check-ins are about the last few hours; the Log remounts this per day.
    if (!isToday) return;
    const evaluate = () => setCheckin(pickCheckinMeal(entries, new Date(), (t) => isAnswered(date, t)));
    evaluate();
    const id = setInterval(evaluate, 60_000);
    return () => clearInterval(id);
  }, [entries, date, isToday]);

  const close = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    setLogged(null);
  }, []);

  const touch = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(close, IDLE_MS);
  }, [close]);

  useEffect(() => () => {
    if (idle.current) clearTimeout(idle.current);
  }, []);

  const log = useCallback(
    async (name: string) => {
      if (busy) return;
      setBusy(true);
      if (checkin) markAnswered(date, checkin.time, "symptom");
      try {
        const res = await fetch("/api/entries/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // A past day has no "now": log it without a time rather than invent one.
          // The ••• menu on the row sets a time if the person knows it.
          body: JSON.stringify({
            entries: [{ entryType: "symptom", name, entryDate: date, ...(isToday ? { entryTime: nowHHMMSS() } : {}) }],
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const created: { id: string }[] = (await res.json().catch(() => ({})))?.entries ?? [];
        if (created[0]) {
          setLogged({ id: created[0].id, name, started: 0, severity: null });
          touch();
        }
        onChanged();
      } catch {
        toast("Couldn't log that — try typing it instead", "error");
      } finally {
        setBusy(false);
      }
    },
    [busy, checkin, date, isToday, onChanged, toast, touch]
  );

  const patch = useCallback(
    async (body: Record<string, unknown>, next: Partial<Logged>) => {
      if (!logged) return;
      touch();
      setLogged({ ...logged, ...next });
      const res = await fetch(`/api/entries/${logged.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      if (!res?.ok) toast("Couldn't save that change", "error");
      onChanged();
    },
    [logged, onChanged, toast, touch]
  );

  const undo = useCallback(async () => {
    if (!logged) return;
    close();
    await fetch(`/api/entries/${logged.id}`, { method: "DELETE" }).catch(() => null);
    onChanged();
  }, [logged, close, onChanged]);

  const fine = useCallback(() => {
    if (checkin) markAnswered(date, checkin.time, "fine");
    setCheckin(null);
  }, [checkin, date]);

  if (logged) {
    return (
      <section aria-label={`${logged.name} logged`} className="mb-4 rounded-2xl bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-elevated)]" onPointerDown={touch}>
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="text-sm font-semibold text-warm-900">
            {logged.name} logged
          </p>
          <div className="-mr-1 flex items-center">
            <button type="button" onClick={() => void undo()} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              Undo
            </button>
            <button type="button" onClick={close} className="min-h-11 rounded-lg px-2 text-sm font-medium text-warm-600 hover:bg-warm-100">
              Done
            </button>
          </div>
        </div>

        {isToday && (
          <>
            <p className="mt-1 text-xs font-semibold text-warm-500" id="started-label">Started</p>
            <div className="flex flex-wrap gap-x-1.5" role="group" aria-labelledby="started-label">
              {STARTED_OPTIONS.map((o) => (
                <Chip
                  key={o.minutes}
                  aria-pressed={logged.started === o.minutes}
                  onClick={() => void patch({ entryTime: startedAt(new Date(), o.minutes) }, { started: o.minutes })}
                  tone={logged.started === o.minutes ? "on" : "idle"}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        <p className={cn("text-xs font-semibold text-warm-500", isToday ? "mt-2" : "mt-1")} id="severity-label">How bad</p>
        <div className="flex flex-wrap gap-x-1.5" role="group" aria-labelledby="severity-label">
          {(Object.keys(SEVERITY) as Array<keyof typeof SEVERITY>).map((k) => (
            <Chip
              key={k}
              aria-pressed={logged.severity === k}
              onClick={() => void patch({ severity: SEVERITY[k] }, { severity: k })}
              tone={logged.severity === k ? "on" : "idle"}
              className="capitalize"
            >
              {k}
            </Chip>
          ))}
        </div>
      </section>
    );
  }

  if (symptoms.length === 0) return null;

  const heading = checkin
    ? `How are you since ${checkin.mealType ?? "your meal"}?`
    : isToday
      ? "How are you feeling?"
      : dayLabel === "Yesterday"
        ? "Any symptoms yesterday?"
        : `Any symptoms on ${dayLabel}?`;

  return (
    <section
      aria-labelledby="symptom-now-heading"
      className={cn("mb-4", checkin && "border-y border-warm-200 py-3")}
    >
      <h3 id="symptom-now-heading" className={cn("text-sm", checkin ? "font-semibold text-warm-900" : "text-warm-600")}>
        {heading}
      </h3>
      {checkin && (
        <p className="text-xs text-warm-500">
          {checkin.names.slice(0, 3).join(", ")}
          {checkin.names.length > 3 ? "…" : ""} · {checkin.time.slice(0, 5)}
        </p>
      )}
      <div className="mt-0.5 flex flex-wrap gap-x-1.5">
        {checkin && <Chip onClick={fine}>Fine</Chip>}
        {symptoms.map((s) => (
          <Chip key={s} disabled={busy} onClick={() => void log(s)}>
            {s}
          </Chip>
        ))}
        <Chip tone="add" onClick={onSomethingElse}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add symptom
        </Chip>
      </div>
    </section>
  );
}
