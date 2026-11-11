/**
 * Turn the lab results stored for one food + property into a rating.
 *
 * The rule, applied the same way to every food:
 * - Excluded results don't count.
 * - Results 20+ years older than the newest one are reference only.
 * - Lab amounts beat list levels (e.g. SIGHI) when both exist.
 * - Amounts: take the middle value (median) and rank it with the
 *   property's bands, either per serving (oxalate) or by concentration
 *   (histamine, tyramine: how much is in the food, mg/kg). The amount per serving is
 *   worked out whenever the food has a serving size.
 * - List levels: take the stated level; if lists disagree, the higher one.
 * - If the counted results would land in different ranks, flag
 *   "studies_disagree" so an admin can decide which to trust.
 * - An admin can set the level by hand (with a note) when the middle value
 *   misleads; the result is flagged "admin_override".
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
  | "pending_list_only"
  | "admin_override"
  | "fodmap_incomplete";

export interface MeasurementInput {
  id: string;
  valuePer100g: number | null;
  reportedLevel: string | null;
  studyYear: number | null;
  excluded: boolean;
  updatedAt: Date;
  /** The source's use; "check" = permission pending, compare only. */
  sourceUse?: string | null;
  /** FODMAP only: which sugar the result measures (see FODMAP_COMPONENTS). */
  component?: string | null;
}

export interface RatingInput {
  property: FoodProperty;
  servingGrams: number | null;
  measurements: MeasurementInput[];
  /** When an admin last signed off on this food + property. */
  reviewedAt?: Date | null;
  /**
   * A level an admin set by hand because the middle value misleads, e.g.
   * results range from not detected to very high. Applies only when there
   * are counted results.
   */
  overrideLevel?: string | null;
  /** The food's category name, e.g. "Fruits" (FODMAP cutoffs depend on it). */
  category?: string | null;
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
  /** FODMAP only: each cutoff check, per serving. */
  fodmap?: FodmapDetail;
}

export interface FodmapCheck {
  /** e.g. "oligos" (fructans + GOS), "sorbitol", "excess_fructose". */
  name: string;
  /** Grams per serving (median of each component). */
  grams: number;
  /** Low if below this, in grams per serving. */
  cutoff: number;
  over: boolean;
}

export interface FodmapDetail {
  checks: FodmapCheck[];
  /** Components a "low" rating still needs tested. */
  missing: string[];
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
  // Tyramine content, mg/kg, same cutoffs as histamine (approved 2026-11-02).
  // EFSA 2011 per-meal limits (6/50/600 mg) are for MAOI users and healthy
  // adults; none exists for histamine intolerance, so this ranks content.
  tyramine: {
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

/**
 * FODMAP: several sugars, each with its own per-serving cutoff (Varney J et
 * al. J Gastroenterol Hepatol 2017;32 Suppl 1:53-61, Table 1; Monash
 * University). A serving is high if any one is at or over its cutoff, low
 * only if every relevant sugar was tested and is under. The cutoffs only
 * separate low from high, so there is no "moderate".
 */
export const FODMAP_COMPONENTS = [
  "fructans",
  "gos",
  "lactose",
  "excess_fructose",
  "sorbitol",
  "mannitol",
  "total_fodmap",
] as const;

export const FODMAP_LABELS: Record<string, string> = {
  fructans: "Fructans",
  gos: "GOS",
  oligos: "Fructans + GOS",
  lactose: "Lactose",
  excess_fructose: "Excess fructose",
  sorbitol: "Sorbitol",
  mannitol: "Mannitol",
  polyols: "Sorbitol + mannitol",
  total_fodmap: "Total FODMAP",
};

export const FODMAP_CUTOFFS = {
  /** Fructans + GOS for core grain products, legumes, nuts and seeds. */
  oligosGrain: 0.3,
  /** Fructans + GOS for fruit, vegetables and all other foods. */
  oligosOther: 0.2,
  sorbitol: 0.2,
  mannitol: 0.2,
  polyols: 0.4,
  excessFructose: 0.15,
  /** Fresh fruit and veg when excess fructose is the only FODMAP present. */
  excessFructoseOnly: 0.4,
  lactose: 1.0,
};

/** Varney 2017 uses the looser oligosaccharide cutoff for grains, legumes, nuts and seeds. */
const GRAIN_CATEGORIES = ["Grains", "Legumes", "Starches & Flours", "Nuts & Seeds"];
const PRODUCE_CATEGORIES = ["Fruits", "Vegetables"];
const isDairy = (category: string | null | undefined) => category === "Dairy";

/** Components that must all be tested before a food can be called low. */
function requiredFodmapComponents(category: string | null | undefined): string[] {
  const plant = ["fructans", "gos", "sorbitol", "mannitol", "excess_fructose"];
  return isDairy(category) ? [...plant, "lactose"] : plant;
}

/** One component's own cutoff, for spotting results that disagree. */
function componentCutoff(component: string, category: string | null | undefined): number | null {
  switch (component) {
    case "fructans":
    case "gos":
      return GRAIN_CATEGORIES.includes(category ?? "") ? FODMAP_CUTOFFS.oligosGrain : FODMAP_CUTOFFS.oligosOther;
    case "sorbitol":
      return FODMAP_CUTOFFS.sorbitol;
    case "mannitol":
      return FODMAP_CUTOFFS.mannitol;
    case "excess_fructose":
      return FODMAP_CUTOFFS.excessFructose;
    case "lactose":
      return FODMAP_CUTOFFS.lactose;
    default:
      return null;
  }
}

function rateFodmap(
  rows: { valuePer100g: number; component: string }[],
  grams: number,
  category: string | null | undefined
): { level: Level | null; detail: FodmapDetail; disagree: boolean; deciding: FodmapCheck | null } {
  const byComponent = new Map<string, number[]>();
  for (const r of rows) byComponent.set(r.component, [...(byComponent.get(r.component) ?? []), r.valuePer100g]);
  const perServing = (c: string) => {
    const v = byComponent.get(c);
    return v ? (median(v) * grams) / 100 : null;
  };
  const known = (c: string) => byComponent.has(c);

  const checks: FodmapCheck[] = [];
  const add = (name: string, value: number | null, cutoff: number) => {
    if (value !== null) checks.push({ name, grams: value, cutoff, over: value >= cutoff });
  };

  const fructans = perServing("fructans");
  const gos = perServing("gos");
  if (fructans !== null || gos !== null) {
    const cutoff = GRAIN_CATEGORIES.includes(category ?? "") ? FODMAP_CUTOFFS.oligosGrain : FODMAP_CUTOFFS.oligosOther;
    add("oligos", (fructans ?? 0) + (gos ?? 0), cutoff);
  }
  const sorbitol = perServing("sorbitol");
  const mannitol = perServing("mannitol");
  add("sorbitol", sorbitol, FODMAP_CUTOFFS.sorbitol);
  add("mannitol", mannitol, FODMAP_CUTOFFS.mannitol);
  if (sorbitol !== null && mannitol !== null) add("polyols", sorbitol + mannitol, FODMAP_CUTOFFS.polyols);

  const required = requiredFodmapComponents(category);
  const ef = perServing("excess_fructose");
  if (ef !== null) {
    // The looser fruit/veg limit applies only when every other sugar was
    // tested and none was found.
    const othersNone = required
      .filter((c) => c !== "excess_fructose")
      .every((c) => known(c) && perServing(c) === 0);
    const cutoff =
      PRODUCE_CATEGORIES.includes(category ?? "") && othersNone
        ? FODMAP_CUTOFFS.excessFructoseOnly
        : FODMAP_CUTOFFS.excessFructose;
    add("excess_fructose", ef, cutoff);
  }
  add("lactose", perServing("lactose"), FODMAP_CUTOFFS.lactose);

  const missing = required.filter((c) => !known(c));
  const overs = checks.filter((c) => c.over);
  const level: Level | null = overs.length > 0 ? "high" : missing.length === 0 ? "low" : null;
  // The check that decided it: the one furthest over (or closest to) its cutoff.
  const ranked = [...(overs.length ? overs : checks)].sort((a, b) => b.grams / b.cutoff - a.grams / a.cutoff);

  const disagree = [...byComponent.entries()].some(([c, values]) => {
    const cutoff = componentCutoff(c, category);
    if (cutoff === null || values.length < 2) return false;
    return new Set(values.map((v) => (v * grams) / 100 >= cutoff)).size > 1;
  });

  return { level, detail: { checks, missing }, disagree, deciding: ranked[0] ?? null };
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

  let fodmap: FodmapDetail | undefined;
  const fodmapRows = counted
    .filter((m) => m.valuePer100g !== null && m.component && m.component !== "total_fodmap")
    .map((m) => ({ valuePer100g: m.valuePer100g as number, component: m.component as string }));

  if (input.property === "fodmap" && fodmapRows.length > 0) {
    method = "median";
    const grams = input.servingGrams !== null && input.servingGrams > 0 ? input.servingGrams : null;
    if (grams === null) {
      flags.push("no_serving_size");
      // Without a serving the lab amounts can't be ranked; a list still can.
      if (reported.length > 0) {
        method = "reported";
        level = reported.reduce((a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a));
        disagree = new Set(reported).size > 1;
      }
    } else {
      const r = rateFodmap(fodmapRows, grams, input.category);
      level = r.level;
      fodmap = r.detail;
      disagree = r.disagree;
      if (r.deciding) {
        amount = r.deciding.grams;
        amountUnit = "g per serving";
        perServing = r.deciding.grams;
      }
      if (level !== null) {
        // A list that rates the food differently from the lab counts as disagreement.
        if (reported.some((l) => l !== level)) disagree = true;
      } else if (reported.length > 0) {
        // Lab data is partial: the list fills the gap (the higher level if lists differ).
        method = "reported";
        level = reported.reduce((a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a));
        disagree = disagree || new Set(reported).size > 1;
        if (r.detail.checks.some((c) => c.over) && level !== "high") disagree = true;
      } else {
        flags.push("fodmap_incomplete");
      }
    }
  } else if (amounts.length > 0) {
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
  if (isLevel(input.overrideLevel ?? null) && counted.length > 0) {
    level = input.overrideLevel as Level;
    band = null;
    flags.push("admin_override");
  }
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
    range: amounts.length && input.property !== "fodmap" ? [Math.min(...amounts), Math.max(...amounts)] : null,
    counted: counted.length,
    superseded,
    flags,
    needsReview: disagree && !reviewedSinceChange,
    ...(fodmap ? { fodmap } : {}),
  };
}
