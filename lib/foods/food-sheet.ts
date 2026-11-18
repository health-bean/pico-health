/**
 * The words in a food's panel on the Log, which answers one question, "is
 * this food a problem for me?", in three voices: your protocol, your log,
 * you. Pure, so it can be tested.
 */

import type { FitTone } from "@/lib/protocols/fit-line";

type Props = Record<string, unknown> | null | undefined;

const AMOUNT: Record<string, string> = { low: "a little", moderate: "some", high: "a lot of", very_high: "a lot of" };
const LEVEL_RANK: Record<string, number> = { low: 1, moderate: 2, high: 3, very_high: 4 };

/** "Blue Cheese" → "Blue cheese", so it reads as part of a sentence. */
function sentenceName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** One reason word ("histamine", "nightshade", "grains") as a phrase about the food, or null for a food group. */
function reasonPhrase(reason: string, props: Props): { has?: string; is?: string } | null {
  const p = props ?? {};
  if (reason === "nightshade" && p.nightshade === true) return { is: "a nightshade" };
  const key = reason === "FODMAP" ? "fodmap" : reason;
  const level = typeof p[key] === "string" ? AMOUNT[p[key] as string] : undefined;
  const releases = reason === "histamine" && p.histamine_liberator === true;
  if (level && releases) return { has: `${level} ${reason} and can make your body release more` };
  if (level) return { has: `${level} ${reason}` };
  if (releases) return { has: "something that can make your body release histamine" };
  return null;
}

/**
 * "On Low Histamine. Spinach has some histamine and can make your body
 * release more." The why behind a verdict, from what's in the food; a food
 * group the protocol rules out ("grains") is named as the protocol's rule.
 */
export function protocolWhy(
  name: string,
  diet: string,
  line: { tone: FitTone; reasons: string[] },
  props: Props
): string {
  const food = sentenceName(name);
  if (line.tone === "allowed") return `Fits your ${diet} protocol.`;
  if (line.tone === "unknown") return `${food} isn't rated for your ${diet} protocol yet.`;
  const has: string[] = [];
  const is: string[] = [];
  const groups: string[] = [];
  for (const r of line.reasons) {
    const ph = reasonPhrase(r, props);
    if (ph?.has) has.push(ph.has);
    else if (ph?.is) is.push(ph.is);
    else groups.push(r);
  }
  const parts: string[] = [];
  if (has.length) parts.push(`${food} has ${joinAnd(has)}.`);
  if (is.length) parts.push(`${food} is ${joinAnd(is)}.`);
  if (groups.length) parts.push(`Your protocol ${line.tone === "avoid" ? "avoids" : "limits"} ${joinAnd(groups)}.`);
  return `On ${diet}. ${parts.join(" ") || `Your protocol ${line.tone === "avoid" ? "avoids" : "limits"} it.`}`;
}

export interface PropertyPatternLike {
  property: string;
  severity: string;
  outcome: { label: string };
  frequency: number;
  totalOpportunities?: number;
}

export interface LogLink {
  /** The property in one plain word, as the fit line says it: "histamine". */
  noun: string;
  /** The strongest line, drawn as dots: days with the symptom out of days with the property. */
  days: number;
  total: number;
  lead: string;
  rest: string;
}

function noun(property: string): string {
  if (property === "histamine_liberator") return "histamine";
  if (property === "fodmap") return "FODMAP";
  return property.replace(/_/g, " ");
}

function foodHas(props: Props, pattern: PropertyPatternLike): boolean {
  const v = (props ?? {})[pattern.property];
  if (v === true) return true;
  if (typeof v !== "string") return false;
  return (LEVEL_RANK[v] ?? 0) >= (LEVEL_RANK[pattern.severity] ?? 99);
}

/**
 * What the person's own log linked to a property this food has, from
 * Insights' "worth keeping an eye on" patterns (which never include early
 * signals). Only counts when the food has at least the level the pattern is
 * about. Null when there's nothing, so the panel simply leaves it out.
 */
export function logLink(props: Props, patterns: PropertyPatternLike[]): LogLink | null {
  if (!props) return null;
  const byNoun = new Map<string, { outcome: string; days: number; total: number }[]>();
  for (const p of patterns) {
    if (!foodHas(props, p)) continue;
    const n = noun(p.property);
    const lines = byNoun.get(n) ?? [];
    if (!lines.some((l) => l.outcome === p.outcome.label)) {
      lines.push({ outcome: p.outcome.label, days: p.frequency, total: p.totalOpportunities ?? p.frequency });
    }
    byNoun.set(n, lines);
  }
  let best: { n: string; lines: { outcome: string; days: number; total: number }[] } | null = null;
  for (const [n, lines] of byNoun) {
    lines.sort((a, b) => b.days / b.total - a.days / a.total);
    if (!best || lines[0].days / lines[0].total > best.lines[0].days / best.lines[0].total) best = { n, lines };
  }
  if (!best) return null;
  const [top, ...others] = best.lines;
  const say = (o: string) => (/^flare day$/i.test(o) ? "a flare" : o.toLowerCase());
  const count = top.days === top.total ? `all ${top.total} days` : `${top.days} of ${top.total} days`;
  const topWord = /^flare day$/i.test(top.outcome) ? "A flare" : top.outcome;
  const tail = others.slice(0, 2).map((l) => `${say(l.outcome)} on ${l.days}`);
  const more = tail.length ? ` ${tail[0].charAt(0).toUpperCase()}${tail[0].slice(1)}${tail[1] ? `, ${tail[1]}` : ""}.` : "";
  return {
    noun: best.n,
    days: top.days,
    total: top.total,
    lead: `${topWord} on ${count}`,
    rest: `you had ${best.n} foods.${more}`,
  };
}

/** Bars filled on a "What's in it" meter: low 1 … very high 4; none and unknown 0. */
export function meterSteps(level: unknown): number {
  return typeof level === "string" ? LEVEL_RANK[level] ?? 0 : 0;
}
