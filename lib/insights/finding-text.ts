/**
 * The words on an Insights card, built from the engine's numbers. Count
 * first ("on 14 of 15 days"); the percentage only ever sits beside the count
 * it came from, next to what it is compared against. Observe, don't prescribe:
 * nothing here says what to do about it.
 */

import type { Factor, MultiFactorResult, SingleFactorResult } from './types';
import { PROPERTY_LABELS } from '@/components/foods/FoodPropertyTag';

/** Meal-timing rows count a symptom within this many hours of eating (lib/insights/timing.ts). */
const TIMING_HOURS = 4;

export interface FindingText {
  /** Rendered as "<factor> → <outcome>". */
  title: { factor: string; outcome: string };
  /** The count, in a sentence. */
  sentence: string;
  /** The same finding as rates, with its comparison. */
  compare: string;
}

export function pct(rate: number): string {
  if (rate > 0 && rate < 0.005) return 'under 1%';
  return `${Math.round(rate * 100)}%`;
}

/** "On days with mold" / "In the week before your period" / "Around ovulation". */
export function whenClause(factor: Pick<Factor, 'label' | 'category'>): string {
  const label = factor.label;
  if (factor.category !== 'cycle') return `On days with ${label.toLowerCase()}`;
  if (/^the week/i.test(label)) return `In ${label.toLowerCase()}`;
  if (/^around/i.test(label)) return label;
  return `On ${label.toLowerCase()}`;
}

function joinAnd(words: string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

export function findingText(r: SingleFactorResult | MultiFactorResult): FindingText {
  const isFlare = r.outcome.type === 'flare_day';
  const symptom = r.outcome.label.toLowerCase();
  const helps = r.direction === 'decreases';
  const outcome = isFlare ? (helps ? 'fewer flare days' : 'flare days') : helps ? `less ${symptom}` : symptom;

  if ('factors' in r && r.factorCount >= 2) {
    const labels = r.factors.map((x) => x.label.toLowerCase());
    const when = r.factorCount === 2 ? `On days with both ${joinAnd(labels)}` : `On days with ${joinAnd(labels)} together`;
    const n = r.frequency;
    const total = r.coOccurrences;
    return {
      title: { factor: r.factors.map((x) => x.label).join(' + '), outcome },
      sentence: isFlare ? `${when}, ${n} of ${total} were flare days.` : `${when}, ${symptom} showed up on ${n} of ${total} days.`,
      compare: `${pct(r.conditionalRate)} of those days, vs ${pct(r.bestSubRate)} with ${r.factorCount === 2 ? 'either one alone' : 'fewer of them'}`,
    };
  }

  const s = r as SingleFactorResult;
  const title = { factor: s.factor.label, outcome };
  if (s.basis === 'meals') {
    return {
      title,
      sentence: `${r.outcome.label} came within ${TIMING_HOURS} hours of ${s.factor.label.toLowerCase()} ${s.frequency} of ${s.totalOpportunities} times.`,
      compare: `${pct(s.conditionalRate)} of the time, vs ${pct(s.baseRate)} after other meals`,
    };
  }
  const when = whenClause(s.factor);
  return {
    title,
    sentence: isFlare
      ? `${when}, ${s.frequency} of ${s.totalOpportunities} were flare days.`
      : `${when}, ${symptom} showed up on ${s.frequency} of ${s.totalOpportunities} days.`,
    compare: `${pct(s.conditionalRate)} of those days, vs ${pct(s.baseRate)} of other days`,
  };
}

/** Yes/no properties have no level; their group reads as a kind of food. Mirrors YES_NO_PROPERTY_LABELS in single-factor.ts. */
const YES_NO_GROUP_TITLES: Record<string, string> = {
  nightshade: 'Nightshades',
  histamine_liberator: 'Foods that can release histamine',
};

/**
 * "Foods high in oxalate", "Foods with moderate histamine", "Nightshades".
 * Never a raw database key: underscores and lowercase acronyms used to leak
 * through ("Foods high in histamine_liberator").
 */
export function propertyGroupTitle(property: string, severity: string): string {
  if (YES_NO_GROUP_TITLES[property]) return YES_NO_GROUP_TITLES[property];
  const label = PROPERTY_LABELS[property] ?? property.replace(/_/g, ' ');
  const noun = label === label.toUpperCase() ? label : label.toLowerCase();
  const level = severity.replace(/_/g, ' ');
  return severity === 'high' || severity === 'very_high' ? `Foods ${level} in ${noun}` : `Foods with ${level} ${noun}`;
}

/** One symptom line on a property card: "Joint pain on 10 of 10 days", "A flare on 8 of 10 days". */
export function propertyLine(outcome: string, days: number, total: number): string {
  const what = /^flare day$/i.test(outcome) ? 'A flare' : outcome;
  return `${what} on ${days} of ${total} days`;
}

/** "high in oxalate", "with moderate histamine", "that can release histamine". */
function propertyPhrase(property: string, severity: string): string {
  if (property === 'histamine_liberator') return 'that can release histamine';
  if (property === 'nightshade') return 'that are nightshades';
  const title = propertyGroupTitle(property, severity);
  return title.replace(/^Foods /, '');
}

export interface PropertyPatternInput {
  property: string;
  severity: string;
  foods: string[];
  outcome: { label: string };
  frequency: number;
  totalOpportunities?: number;
  impactScore: number;
}

export interface PropertyCard {
  key: string;
  title: string;
  sentence: string;
  impact: number;
}

function listFoods(foods: string[]): string {
  const shown = foods.slice(0, 3);
  const more = foods.length - shown.length;
  if (more > 0) return `${shown.join(', ')} and ${more} more`;
  return joinOr(shown);
}

function joinOr(words: string[]): string {
  return words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/**
 * One card per food property, its symptoms as one sentence that says which
 * days were counted. Two properties that cover the same foods and the same
 * counts (moderate histamine / can release histamine, often) are one card,
 * not two identical ones.
 */
export function propertyCards(patterns: PropertyPatternInput[]): PropertyCard[] {
  const groups = new Map<string, { props: { property: string; severity: string }[]; foods: Set<string>; lines: { outcome: string; days: number; total: number }[]; impact: number }>();
  for (const p of patterns) {
    const key = `${p.severity}|${p.property}`;
    const g = groups.get(key) ?? { props: [{ property: p.property, severity: p.severity }], foods: new Set<string>(), lines: [], impact: 0 };
    for (const f of p.foods) g.foods.add(f);
    g.lines.push({ outcome: p.outcome.label, days: p.frequency, total: p.totalOpportunities ?? p.frequency });
    g.impact = Math.max(g.impact, p.impactScore);
    groups.set(key, g);
  }

  // Merge groups with the same foods and the same counts.
  const merged: typeof groups extends Map<string, infer V> ? V[] : never = [];
  const signature = (g: { foods: Set<string>; lines: { outcome: string; days: number; total: number }[] }) =>
    [...g.foods].sort().join('|') + '#' + [...g.lines].sort((a, b) => a.outcome.localeCompare(b.outcome)).map((l) => `${l.outcome}:${l.days}/${l.total}`).join(',');
  const bySig = new Map<string, (typeof merged)[number]>();
  for (const g of groups.values()) {
    const sig = signature(g);
    const existing = bySig.get(sig);
    if (existing) {
      existing.props.push(...g.props);
      existing.impact = Math.max(existing.impact, g.impact);
    } else {
      const copy = { ...g, props: [...g.props] };
      bySig.set(sig, copy);
      merged.push(copy);
    }
  }

  return merged
    .map((g) => {
      const lines = [...g.lines].sort((a, b) => b.days / b.total - a.days / a.total).slice(0, 3);
      const title = g.props.length === 1
        ? propertyGroupTitle(g.props[0].property, g.props[0].severity)
        : `Foods ${joinOr(g.props.map((p) => propertyPhrase(p.property, p.severity)))}`;
      const sameTotal = lines.every((l) => l.total === lines[0].total);
      const foods = [...g.foods];
      let sentence: string;
      if (sameTotal) {
        const parts = lines.map((l) => {
          const what = /^flare day$/i.test(l.outcome) ? 'a flare' : l.outcome.toLowerCase();
          return `${what} on ${l.days === l.total ? `all ${l.days}` : l.days}`;
        });
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        // The engine doesn't always name the foods; the title already does by property.
        const which = foods.length > 0 ? listFoods(foods).toLowerCase() : 'these foods';
        sentence = `On the ${lines[0].total} days you had ${which}: ${[first, ...parts.slice(1)].join(', ')}.`;
      } else {
        sentence = lines.map((l) => propertyLine(l.outcome, l.days, l.total)).join('. ') + '.';
      }
      return { key: g.props.map((p) => `${p.severity}|${p.property}`).join('+'), title, sentence, impact: g.impact };
    })
    .sort((a, b) => b.impact - a.impact);
}
