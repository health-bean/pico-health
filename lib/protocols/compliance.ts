import { db } from "@/lib/db";
import {
  protocolRules,
  protocolFoodOverrides,
  foodTriggerProperties,
  foods,
  foodSubcategories,
  foodCategories,
} from "@/lib/db/schema";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import type { ProtocolStatus } from "@/types";

export interface ComplianceResult {
  status: ProtocolStatus;
  violations: string[];
}

export interface FoodProperties {
  oxalate?: string | null;
  histamine?: string | null;
  lectin?: string | null;
  nightshade?: boolean | null;
  fodmap?: string | null;
  salicylate?: string | null;
  amines?: string | null;
  glutamates?: string | null;
  sulfites?: string | null;
  goitrogens?: string | null;
  purines?: string | null;
  phytoestrogens?: string | null;
  phytates?: string | null;
  tyramine?: string | null;
}

interface ProtocolRule {
  ruleType: string;
  propertyName: string | null;
  propertyValues: string[] | null;
  status: string;
  notes: string | null;
}

interface FoodOverride {
  foodId: string;
  status: string;
  overrideReason: string | null;
}

/**
 * Pre-loaded protocol context for batch compliance checking.
 * Load once, check many foods — eliminates N+1 queries.
 */
export interface ProtocolContext {
  rules: ProtocolRule[];
  overrides: Map<string, FoodOverride>;
}

/**
 * Load protocol rules and overrides in bulk. Call once per request,
 * then pass the context to checkComplianceSync for each food.
 */
export async function loadProtocolContext(
  protocolId: string,
  phaseId?: string | null,
  foodIds?: string[]
): Promise<ProtocolContext> {
  // Build rule conditions
  const ruleConditions = [eq(protocolRules.protocolId, protocolId)];
  if (phaseId) {
    ruleConditions.push(
      or(isNull(protocolRules.phaseId), eq(protocolRules.phaseId, phaseId))!
    );
  } else {
    ruleConditions.push(isNull(protocolRules.phaseId));
  }

  // Load rules and overrides in parallel
  const [rules, overrideRows] = await Promise.all([
    db
      .select({
        ruleType: protocolRules.ruleType,
        propertyName: protocolRules.propertyName,
        propertyValues: protocolRules.propertyValues,
        status: protocolRules.status,
        notes: protocolRules.notes,
      })
      .from(protocolRules)
      .where(and(...ruleConditions)),
    foodIds && foodIds.length > 0
      ? db
          .select({
            foodId: protocolFoodOverrides.foodId,
            status: protocolFoodOverrides.status,
            overrideReason: protocolFoodOverrides.overrideReason,
          })
          .from(protocolFoodOverrides)
          .where(
            and(
              eq(protocolFoodOverrides.protocolId, protocolId),
              inArray(protocolFoodOverrides.foodId, foodIds)
            )
          )
      : Promise.resolve([]),
  ]);

  const overrides = new Map<string, FoodOverride>();
  for (const o of overrideRows) {
    overrides.set(o.foodId, o);
  }

  return { rules, overrides };
}

/**
 * Check compliance synchronously using a pre-loaded protocol context.
 * No database queries — pure in-memory evaluation.
 */
export function checkComplianceSync(
  ctx: ProtocolContext,
  foodProperties: FoodProperties,
  foodId?: string | null,
  categoryName?: string | null
): ComplianceResult {
  const violations: string[] = [];

  // Check for food-specific override first
  if (foodId) {
    const override = ctx.overrides.get(foodId);
    if (override) {
      if (override.overrideReason && override.status === "avoid") {
        violations.push(override.overrideReason);
      }
      return { status: override.status as ProtocolStatus, violations };
    }
  }

  let finalStatus: ProtocolStatus = "allowed";
  // Restricted properties this food has no rating for. An unrated food is
  // "unknown", never "allowed": we only claim a food fits when the data says so.
  const unrated = new Set<string>();

  for (const rule of ctx.rules) {
    // Production rules say "caution"; the app's status for it is "moderation".
    const ruleStatus = rule.status === "caution" ? "moderation" : rule.status;
    if (rule.ruleType === "property" && rule.propertyName && rule.propertyValues) {
      const propertyValue = foodProperties[rule.propertyName as keyof FoodProperties];
      const restricts = ruleStatus === "avoid" || ruleStatus === "moderation";
      if (restricts && (propertyValue === undefined || propertyValue === null || propertyValue === "unknown")) {
        unrated.add(rule.propertyName);
      } else if (propertyValue !== undefined && propertyValue !== null) {
        const strValue = String(propertyValue);
        if (matchesRule(rule.propertyValues, strValue, restricts)) {
          if (ruleStatus === "avoid") {
            finalStatus = "avoid";
            const propertyLabel = formatPropertyName(rule.propertyName);
            const valueLabel = formatPropertyValue(rule.propertyName, strValue);
            violations.push(
              valueLabel
                ? `${propertyLabel} ${valueLabel} not allowed`
                : `${propertyLabel} not allowed`
            );
          } else if (ruleStatus === "moderation" && finalStatus !== "avoid") {
            finalStatus = "moderation";
            const propertyLabel = formatPropertyName(rule.propertyName);
            const valueLabel = formatPropertyValue(rule.propertyName, strValue);
            violations.push(
              valueLabel
                ? `${propertyLabel} ${valueLabel} should be limited`
                : `${propertyLabel} should be limited`
            );
          }
        }
      }
    } else if (rule.ruleType === "category" && rule.propertyValues && categoryName) {
      if (rule.propertyValues.includes(categoryName)) {
        if (ruleStatus === "avoid") {
          finalStatus = "avoid";
          violations.push(`${categoryName} not allowed`);
        } else if (ruleStatus === "moderation" && finalStatus !== "avoid") {
          finalStatus = "moderation";
          violations.push(`${categoryName} should be limited`);
        }
      }
    }
  }

  if (finalStatus === "allowed" && unrated.size > 0) {
    return {
      status: "unknown",
      violations: [...unrated].map((p) => `${formatPropertyName(p)} not rated yet`),
    };
  }

  return { status: finalStatus, violations };
}

const LEVEL_ORDER = ["none", "low", "moderate", "high", "very_high"];

/**
 * Does a food's value match a rule? A restricting rule on a level ("avoid
 * high") also covers every level above it, so very_high is caught too.
 * Everything else (booleans, allowed rules) matches exactly.
 */
function matchesRule(ruleValues: string[], value: string, restricts: boolean): boolean {
  if (ruleValues.includes(value)) return true;
  if (!restricts) return false;
  const rank = LEVEL_ORDER.indexOf(value);
  const ruleRanks = ruleValues.map((v) => LEVEL_ORDER.indexOf(v)).filter((r) => r >= 0);
  return rank >= 0 && ruleRanks.length > 0 && rank >= Math.min(...ruleRanks);
}

/**
 * Check if a food complies with a protocol's rules.
 * Makes 2 DB queries per call — use loadProtocolContext + checkComplianceSync
 * for batch checking instead.
 */
export async function checkCompliance(
  foodProperties: FoodProperties,
  protocolId: string,
  phaseId?: string | null,
  foodId?: string | null,
  categoryName?: string | null
): Promise<ComplianceResult> {
  const ctx = await loadProtocolContext(
    protocolId,
    phaseId,
    foodId ? [foodId] : undefined
  );
  return checkComplianceSync(ctx, foodProperties, foodId, categoryName);
}

/**
 * Check compliance for a food by ID.
 * Fetches the food's properties and category from the database.
 */
export async function checkFoodCompliance(
  foodId: string,
  protocolId: string,
  phaseId?: string | null
): Promise<ComplianceResult> {
  const [food] = await db
    .select({
      id: foods.id,
      categoryName: foodCategories.name,
      properties: {
        oxalate: foodTriggerProperties.oxalate,
        histamine: foodTriggerProperties.histamine,
        lectin: foodTriggerProperties.lectin,
        nightshade: foodTriggerProperties.nightshade,
        fodmap: foodTriggerProperties.fodmap,
        salicylate: foodTriggerProperties.salicylate,
        amines: foodTriggerProperties.amines,
        glutamates: foodTriggerProperties.glutamates,
        sulfites: foodTriggerProperties.sulfites,
        goitrogens: foodTriggerProperties.goitrogens,
        purines: foodTriggerProperties.purines,
        phytoestrogens: foodTriggerProperties.phytoestrogens,
        phytates: foodTriggerProperties.phytates,
        tyramine: foodTriggerProperties.tyramine,
      },
    })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(
      foodCategories,
      eq(foodSubcategories.categoryId, foodCategories.id)
    )
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(eq(foods.id, foodId))
    .limit(1);

  if (!food) {
    return { status: "unknown", violations: ["Food not found"] };
  }

  if (!food.properties) {
    return { status: "unknown", violations: ["Food properties not available"] };
  }

  return checkCompliance(food.properties, protocolId, phaseId, foodId, food.categoryName);
}

function formatPropertyName(propertyName: string): string {
  const labels: Record<string, string> = {
    oxalate: "Oxalate",
    histamine: "Histamine",
    lectin: "Lectin",
    nightshade: "Nightshade",
    fodmap: "FODMAP",
    salicylate: "Salicylate",
    amines: "Amines",
    glutamates: "Glutamates",
    sulfites: "Sulfites",
    goitrogens: "Goitrogens",
    purines: "Purines",
    phytoestrogens: "Phytoestrogens",
    phytates: "Phytates",
    tyramine: "Tyramine",
  };
  return labels[propertyName] || propertyName;
}

function formatPropertyValue(propertyName: string, value: string): string {
  if (value === "true") return "";
  if (["high", "moderate", "low", "very_high"].includes(value)) return `(${value})`;
  return value;
}
