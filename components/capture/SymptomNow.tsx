"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** YYYY-MM-DD for today. */
  date: string;
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

const chip =
  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-500";
const chipIdle =
  "border-[var(--color-border-light)] bg-[var(--color-surface-card)] text-warm-900 shadow-[var(--shadow-card)] hover:border-teal-300 hover:text-teal-700";
const chipOn = "border-teal-700 bg-teal-700 text-white";
const chipGhost = "border-transparent bg-transparent text-teal-700 hover:bg-teal-50";

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
export function SymptomNow({ entries, date, onChanged, onSomethingElse }: SymptomNowProps) {
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
    const evaluate = () => setCheckin(pickCheckinMeal(entries, new Date(), (t) => isAnswered(date, t)));
    evaluate();
    const id = setInterval(evaluate, 60_000);
    return () => clearInterval(id);
  }, [entries, date]);

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
          body: JSON.stringify({ entries: [{ entryType: "symptom", name, entryDate: date, entryTime: nowHHMMSS() }] }),
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
    [busy, checkin, date, onChanged, toast, touch]
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

        <p className="mt-1 text-xs font-semibold text-warm-500" id="started-label">Started</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby="started-label">
          {STARTED_OPTIONS.map((o) => (
            <button
              key={o.minutes}
              type="button"
              aria-pressed={logged.started === o.minutes}
              onClick={() => void patch({ entryTime: startedAt(new Date(), o.minutes) }, { started: o.minutes })}
              className={cn(chip, logged.started === o.minutes ? chipOn : chipIdle)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-semibold text-warm-500" id="severity-label">How bad</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby="severity-label">
          {(Object.keys(SEVERITY) as Array<keyof typeof SEVERITY>).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={logged.severity === k}
              onClick={() => void patch({ severity: SEVERITY[k] }, { severity: k })}
              className={cn(chip, "capitalize", logged.severity === k ? chipOn : chipIdle)}
            >
              {k}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (symptoms.length === 0) return null;

  const heading = checkin ? `How are you since ${checkin.mealType ?? "your meal"}?` : "How are you feeling?";

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
      <div className="mt-2 flex flex-wrap gap-1.5">
        {checkin && (
          <button type="button" onClick={fine} className={cn(chip, chipIdle)}>
            Fine
          </button>
        )}
        {symptoms.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => void log(s)} className={cn(chip, chipIdle)}>
            {s}
          </button>
        ))}
        <button type="button" onClick={onSomethingElse} className={cn(chip, chipGhost)}>
          Something else
        </button>
      </div>
    </section>
  );
}
