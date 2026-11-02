/**
 * Turn the lab results stored for one food + property into a rating.
 *
 * The rule, applied the same way to every food:
 * - Excluded results don't count.
 * - Results 20+ years older than the newest one are reference only.
 * - Lab amounts beat list levels (e.g. SIGHI) when both exist.
 * - Amounts: take the middle value (median) and rank it with the
 *   property's bands, either per serving (oxalate) or by concentration
 *   (histamine: how much is in the food, mg/kg). The amount per serving is
 *   worked out whenever the food has a serving size.
 * - List levels: take the stated level; if lists disagree, the higher one.
 * - If the counted results would land in different ranks, flag
 *   "studies_disagree" so an admin can decide which to trust.
 * - Results from a "permission pending" source never count. They're only
 *   compared: "lists_disagree" when one rates the food differently, and
 *   "pending_list_only" when it rates a food we have nothing else for.
 *
 * Pure: no database access. Tested in compute.test.ts.
 */
import type { FoodProperty } from "@/lib/sources/properties";

export type Level = "none" | "low" | "moderate" | "high" | "very_high";
export const LEVELS: readonly Level[] = ["none", "low", "moderate", "high", "very_high"];

export type Flag =
  | "one_test"
  | "studies_disagree"
  | "no_serving_size"
  | "no_rule"
  | "lists_disagree"
  | "pending_list_only";

export interface MeasurementInput {
  id: string;
  valuePer100g: number | null;
  reportedLevel: string | null;
  studyYear: number | null;
  excluded: boolean;
  updatedAt: Date;
  /** The source's use; "check" = permission pending, compare only. */
  sourceUse?: string | null;
}

export interface RatingInput {
  property: FoodProperty;
  servingGrams: number | null;
  measurements: MeasurementInput[];
  /** When an admin last signed off on this food + property. */
  reviewedAt?: Date | null;
}

export interface RatingResult {
  /** The app-wide level, or null when there's nothing to go on (→ "unknown"). */
  level: Level | null;
  /** Fine-grained band for amount rules, e.g. "VH+". */
  band: string | null;
  method: "median" | "reported" | null;
  median: number | null;
  perServing: number | null;
  /** The amount the rating is based on, in `amountUnit` (per serving or per kg). */
  amount: number | null;
  amountUnit: string | null;
  range: [number, number] | null;
  /** How many results counted toward the rating. */
  counted: number;
  /** Ids of results set aside as reference because newer data exists. */
  superseded: string[];
  flags: Flag[];
  /** Studies disagree and no admin has signed off since the last change. */
  needsReview: boolean;
}

interface Band {
  /** Upper limit (exclusive) of this band, in the rule's unit. */
  below: number;
  band: string;
  level: Level;
}

interface AmountRule {
  /** serving: mg per serving. concentration: mg per kg of food. */
  basis: "serving" | "concentration";
  unit: string;
  /** Band for a result of zero (lab found none), if the rule has one. */
  notDetected?: { band: string; level: Level };
  bands: Band[];
  /** Band for anything at or above the last limit. */
  top: { band: string; level: Level };
}

/**
 * Ranking rules for lab amounts, per property. Oxalate bands are inferred
 * from Sally K. Norton's published ranks (mg per serving; matched 22 of 24
 * test foods). Other properties get bands once we have their data.
 */
export const AMOUNT_RULES: Partial<Record<FoodProperty, AmountRule>> = {
  oxalate: {
    basis: "serving",
    unit: "mg",
    bands: [
      { below: 1.5, band: "VL", level: "low" },
      { below: 4.5, band: "L", level: "low" },
      { below: 11.5, band: "M", level: "moderate" },
      { below: 23, band: "H", level: "high" },
      { below: 60, band: "VH", level: "very_high" },
    ],
    top: { band: "VH+", level: "very_high" },
  },
  // Histamine content, mg/kg (approved 2026-11-02). 100/200 mg/kg are the EU
  // legal limits for fish; there is no agreed safe dose for histamine
  // intolerance, so this ranks content, not a serving.
  histamine: {
    basis: "concentration",
    unit: "mg/kg",
    notDetected: { band: "ND", level: "low" },
    bands: [
      { below: 10, band: "L", level: "low" },
      { below: 50, band: "M", level: "moderate" },
      { below: 200, band: "H", level: "high" },
    ],
    top: { band: "VH", level: "very_high" },
  },
};

export const BAND_LABELS: Record<string, string> = {
  ND: "Not detected",
  VL: "Very low",
  L: "Low",
  M: "Medium",
  H: "High",
  VH: "Very high",
  "VH+": "Extreme",
};

/** Results this many years older than the newest are reference only. */
export const SUPERSEDED_AFTER_YEARS = 20;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function bandFor(rule: AmountRule, amount: number): { band: string; level: Level } {
  if (amount === 0 && rule.notDetected) return rule.notDetected;
  for (const b of rule.bands) if (amount < b.below) return b;
  return rule.top;
}

/** The amount a rule ranks, from a result stored per 100 g. */
function rankedAmount(rule: AmountRule, per100g: number, servingGrams: number | null): number | null {
  if (rule.basis === "concentration") return per100g * 10; // per 100 g → per kg
  if (servingGrams === null || servingGrams <= 0) return null;
  return (per100g * servingGrams) / 100;
}

function isLevel(v: string | null): v is Level {
  return v !== null && (LEVELS as readonly string[]).includes(v);
}

export function computeRating(input: RatingInput): RatingResult {
  const live = input.measurements.filter((m) => !m.excluded);
  const included = live.filter((m) => m.sourceUse !== "check");
  const checkLevels = live.filter((m) => m.sourceUse === "check").map((m) => m.reportedLevel).filter(isLevel);

  // Recency: older results become reference only when much newer data exists.
  const years = included.map((m) => m.studyYear).filter((y): y is number => y !== null);
  const newest = years.length ? Math.max(...years) : null;
  const superseded = included
    .filter((m) => newest !== null && m.studyYear !== null && m.studyYear <= newest - SUPERSEDED_AFTER_YEARS)
    .map((m) => m.id);
  const counted = included.filter((m) => !superseded.includes(m.id));

  const amounts = counted.map((m) => m.valuePer100g).filter((v): v is number => v !== null);
  const reported = counted.map((m) => m.reportedLevel).filter(isLevel);

  const flags: Flag[] = [];
  if (counted.length === 1) flags.push("one_test");

  let level: Level | null = null;
  let band: string | null = null;
  let method: RatingResult["method"] = null;
  let med: number | null = null;
  let perServing: number | null = null;
  let amount: number | null = null;
  let amountUnit: string | null = null;
  let disagree = false;

  if (amounts.length > 0) {
    method = "median";
    med = median(amounts);
    const rule = AMOUNT_RULES[input.property];
    const grams = input.servingGrams !== null && input.servingGrams > 0 ? input.servingGrams : null;
    if (grams !== null) perServing = (med * grams) / 100;
    const ranked = rule ? rankedAmount(rule, med, grams) : null;
    if (!rule) {
      flags.push("no_rule");
    } else if (ranked === null) {
      flags.push("no_serving_size");
    } else {
      ({ band, level } = bandFor(rule, ranked));
      amount = ranked;
      amountUnit = rule.basis === "serving" ? `${rule.unit} per serving` : rule.unit;
      // Oxalate: results in different bands disagree. Histamine: only
      // different levels do ("not detected" vs 2 mg/kg is not a conflict).
      const key = (v: number) => {
        const b = bandFor(rule, rankedAmount(rule, v, grams)!);
        return rule.basis === "serving" ? b.band : b.level;
      };
      const resultKeys = new Set(amounts.map(key));
      // A list source stating a different level also counts as disagreement.
      disagree = resultKeys.size > 1 || reported.some((r) => r !== level);
    }
  } else if (reported.length > 0) {
    method = "reported";
    // Lists that disagree: take the higher (more cautious) level.
    level = reported.reduce((a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a));
    disagree = new Set(reported).size > 1;
  }

  if (disagree) flags.push("studies_disagree");
  if (checkLevels.length > 0) {
    if (level === null) flags.push("pending_list_only");
    else if (checkLevels.some((l) => l !== level)) flags.push("lists_disagree");
  }

  const lastChange = Math.max(0, ...input.measurements.map((m) => m.updatedAt.getTime()));
  const reviewedSinceChange = !!input.reviewedAt && input.reviewedAt.getTime() >= lastChange;

  return {
    level,
    band,
    method,
    median: med,
    perServing,
    amount,
    amountUnit,
    range: amounts.length ? [Math.min(...amounts), Math.max(...amounts)] : null,
    counted: counted.length,
    superseded,
    flags,
    needsReview: disagree && !reviewedSinceChange,
  };
}
