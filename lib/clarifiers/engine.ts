import { CLARIFIER_RULES } from "./rules";
import {
  DAILY_CAP,
  SKIP_SUPPRESS_AFTER,
  type Clarifier,
  type ClarifierDimension,
  type ClarifierRule,
  type PropertyAxis,
  type PropertyLevel,
  type SelectClarifierInput,
} from "./types";

const LEVEL_RANK: Record<PropertyLevel, number> = {
  unknown: 0,
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

function levelOf(
  properties: SelectClarifierInput["properties"],
  axis: PropertyAxis
): number {
  const raw = properties?.[axis];
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "boolean") return raw ? LEVEL_RANK.high : 0;
  return LEVEL_RANK[raw] ?? 0;
}

/** Does the entry already carry a value for this dimension? */
export function isFilled(
  structuredContent: Record<string, unknown> | null,
  dimension: ClarifierDimension
): boolean {
  const v = structuredContent?.[dimension];
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === "string" && v.length > 0;
}

/**
 * Axes on which this rule is relevant for the food: the food is at/above the
 * rule's threshold on the axis AND (no protocol, or the protocol restricts it).
 */
function relevantAxes(rule: ClarifierRule, input: SelectClarifierInput): PropertyAxis[] {
  const min = LEVEL_RANK[rule.minLevel];
  return rule.axes.filter((axis) => {
    if (levelOf(input.properties, axis) < min) return false;
    return input.protocolAxes === null || input.protocolAxes.has(axis);
  });
}

/**
 * Pick the single clarifier to ask for one entry, or null. Pure and
 * deterministic: identical inputs always produce the identical result.
 */
export function selectClarifier(
  input: SelectClarifierInput,
  rules: readonly ClarifierRule[] = CLARIFIER_RULES
): Clarifier | null {
  const { entry } = input;
  if (!entry.foodId || !input.properties) return null;
  if (input.answeredToday >= DAILY_CAP) return null;

  const candidates = [...rules]
    .sort((a, b) => a.priority - b.priority)
    .filter((rule) => {
      if (relevantAxes(rule, input).length === 0) return false;
      if (rule.categoryPattern && !rule.categoryPattern.test(entry.foodCategory ?? "")) {
        return false;
      }
      if (isFilled(entry.structuredContent, rule.dimension)) return false;
      const past = input.history.find((h) => h.dimension === rule.dimension);
      if (past) {
        if (past.answerCount > 0) return false;
        if (past.skipCount >= SKIP_SUPPRESS_AFTER) return false;
      }
      return true;
    });

  const rule = candidates[0];
  if (!rule) return null;

  const suggested = input.userDefaults[rule.dimension] ?? null;
  return {
    entryId: entry.id,
    foodId: entry.foodId,
    foodName: entry.foodName,
    ruleId: rule.id,
    dimension: rule.dimension,
    question: rule.question.replace("{food}", entry.foodName),
    why: rule.why,
    options: rule.options,
    multi: rule.multi,
    suggested: suggested && rule.options.some((o) => o.value === suggested) ? suggested : null,
  };
}
