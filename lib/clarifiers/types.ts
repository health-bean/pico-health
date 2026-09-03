/**
 * Clarifiers — deterministic follow-up questions asked after a food is
 * logged, chosen by a rules table (not the model). See
 * docs/superpowers/specs/2026-09-03-clarifiers-design.md.
 */

export type ClarifierDimension = "preparation" | "quantity" | "additions";

/** Trigger-property axes a rule may key on. Mirrors food_trigger_properties columns. */
export type PropertyAxis =
  | "histamine"
  | "amines"
  | "tyramine"
  | "fodmap"
  | "oxalate"
  | "nightshade"
  | "salicylate"
  | "lectin"
  | "glutamates"
  | "sulfites";

export type PropertyLevel = "none" | "low" | "moderate" | "high" | "very_high" | "unknown";

export interface ClarifierOption {
  value: string;
  label: string;
}

export interface ClarifierRule {
  /** Stable id, e.g. "histamine-preparation". */
  id: string;
  dimension: ClarifierDimension;
  /** Axes that make this rule relevant for a food. */
  axes: PropertyAxis[];
  /** Minimum food level on one of `axes` for the rule to apply. */
  minLevel: "moderate" | "high";
  /** Restrict to savory / composite food categories (regex on category name). */
  categoryPattern?: RegExp;
  /** Question template; `{food}` is replaced with the food's display name. */
  question: string;
  /** One-line rationale shown as a whisper, e.g. "matters for histamine". */
  why: string;
  options: ClarifierOption[];
  /** Whether several options may be chosen (additions) or exactly one. */
  multi: boolean;
  /** Lower runs first. */
  priority: number;
}

/** What the UI receives for one entry. */
export interface Clarifier {
  entryId: string;
  foodId: string;
  foodName: string;
  ruleId: string;
  dimension: ClarifierDimension;
  question: string;
  why: string;
  options: ClarifierOption[];
  multi: boolean;
  /** Pre-selected option from the user's history for this dimension, if any. */
  suggested: string | null;
}

/** One row of clarifier_responses for (user, food, dimension). */
export interface ClarifierHistory {
  dimension: ClarifierDimension;
  answer: string | null;
  answerCount: number;
  skipCount: number;
}

export interface SelectClarifierInput {
  entry: {
    id: string;
    foodId: string | null;
    foodName: string;
    foodCategory: string | null;
    structuredContent: Record<string, unknown> | null;
  };
  /** Food's trigger properties, or null when unknown (custom/USDA foods). */
  properties: Partial<Record<PropertyAxis, PropertyLevel | boolean>> | null;
  /**
   * Axes the user's protocol restricts (property rules with status
   * avoid/moderation). `null` = no protocol → fall back to "any high axis".
   */
  protocolAxes: Set<PropertyAxis> | null;
  /** Prior responses for this user × this food. */
  history: ClarifierHistory[];
  /** Most frequent past answer per dimension across all foods. */
  userDefaults: Partial<Record<ClarifierDimension, string>>;
  /** Responses (answers + skips) already recorded today. */
  answeredToday: number;
}

export const DAILY_CAP = 3;
export const SKIP_SUPPRESS_AFTER = 2;
