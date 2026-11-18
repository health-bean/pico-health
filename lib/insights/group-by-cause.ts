/**
 * One card per cause. The engine returns one row per cause-and-symptom pair,
 * so mold showed up twice in a row ("Mold → brain fog", "Mold → flare days")
 * and pushed other causes off the first screen. Here a cause keeps its
 * strongest row as the card and folds the rest into one "Also" line.
 * Combinations of causes stay as cards of their own.
 */

import type { MultiFactorResult, SingleFactorResult } from './types';

type Result = SingleFactorResult | MultiFactorResult;

export interface CauseGroup<T extends Result = Result> {
  /** The strongest row for this cause (the engine's order decides). */
  lead: T;
  /** Its other symptoms, strongest first. */
  others: T[];
}

/** The single cause a row is about, or null for a combination. */
export function causeKey(r: Result): string | null {
  if ('factors' in r) return r.factorCount >= 2 ? null : r.factors[0]?.key ?? null;
  return r.factor.key;
}

/** Groups rows by cause, keeping the order in which each cause first appears. */
export function groupByCause<T extends Result>(rows: T[]): CauseGroup<T>[] {
  const groups: CauseGroup<T>[] = [];
  const byKey = new Map<string, CauseGroup<T>>();
  for (const r of rows) {
    const key = causeKey(r);
    const existing = key ? byKey.get(key) : undefined;
    if (existing) {
      existing.others.push(r);
      continue;
    }
    const g = { lead: r, others: [] as T[] };
    groups.push(g);
    if (key) byKey.set(key, g);
  }
  return groups;
}

/** Meal-timing rows count a symptom within this many hours of eating (lib/insights/timing.ts). */
const TIMING_HOURS = 4;

function total(r: Result): number {
  return 'factors' in r ? r.coOccurrences : r.totalOpportunities;
}

function phrase(r: Result): string {
  const helps = r.direction === 'decreases';
  const isFlare = r.outcome.type === 'flare_day';
  const symptom = r.outcome.label.toLowerCase();
  const n = r.frequency;
  const of = total(r);
  if ((r as SingleFactorResult).basis === 'meals') return `${symptom} within ${TIMING_HOURS} hours, ${n} of ${of} times`;
  if (helps) return isFlare ? `fewer flare days (${n} of ${of})` : `less ${symptom} (${n} of ${of} days)`;
  return isFlare ? `a flare on ${n} of ${of} days` : `${symptom} on ${n} of ${of} days`;
}

/**
 * "Also: a flare on 13 of 15 days, joint pain on 8 of 15 days." A "severe
 * brain fog" row is left out when the card already counts brain fog. At most
 * three, so the card stays one finding with a footnote. Undefined when the
 * cause has nothing else.
 */
export function alsoLine(lead: Result, others: Result[], max = 3): string | undefined {
  const counted = new Set([lead, ...others].filter((r) => r.outcome.type === 'symptom_occurrence').map((r) => r.outcome.label.toLowerCase()));
  const kept = others.filter(
    (r) => !(r.outcome.type === 'symptom_severity' && counted.has(r.outcome.label.replace(/^severe\s+/i, '').toLowerCase()))
  );
  if (kept.length === 0) return undefined;
  return `Also: ${kept.slice(0, max).map(phrase).join(', ')}.`;
}
