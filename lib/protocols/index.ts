import { db } from "@/lib/db";
import {
  protocols,
  protocolPhases,
  protocolRules,
  protocolFoodOverrides,
  userProtocolState,
  foodTriggerProperties,
  foods,
  foodCategories,
  foodSubcategories,
} from "@/lib/db/schema";
import { eq, and, asc, or, isNull } from "drizzle-orm";

export interface ProtocolContext {
  protocolId: string;
  protocolName: string;
  hasPhases: boolean;
  currentPhase: {
    id: string;
    name: string;
    slug: string;
    phaseOrder: number;
    totalPhases: number;
    durationWeeks: number | null;
    description: string | null;
    guidance: string | null;
    dayNumber: number;
    daysRemaining: number | null;
  } | null;
  rules: {
    ruleType: string;
    propertyName: string | null;
    propertyValues: string[] | null;
    status: string;
    notes: string | null;
  }[];
}

/**
 * Get the full protocol context for a user, including phase info and applicable rules.
 */
export async function getUserProtocolContext(
  userId: string,
  protocolId: string
): Promise<ProtocolContext | null> {
  const [protocol] = await db
    .select({
      id: protocols.id,
      name: protocols.name,
      hasPhases: protocols.hasPhases,
    })
    .from(protocols)
    .where(eq(protocols.id, protocolId))
    .limit(1);

  if (!protocol) return null;

  let currentPhase: ProtocolContext["currentPhase"] = null;
  let phaseId: string | null = null;

  if (protocol.hasPhases) {
    // Get user's protocol state
    const [state] = await db
      .select()
      .from(userProtocolState)
      .where(
        and(
          eq(userProtocolState.userId, userId),
          eq(userProtocolState.protocolId, protocolId)
        )
      )
      .limit(1);

    if (state?.currentPhaseId) {
      phaseId = state.currentPhaseId;

      const [phase] = await db
        .select()
        .from(protocolPhases)
        .where(eq(protocolPhases.id, state.currentPhaseId))
        .limit(1);

      const allPhases = await db
        .select({ id: protocolPhases.id })
        .from(protocolPhases)
        .where(eq(protocolPhases.protocolId, protocolId));

      if (phase) {
        const startDate = new Date(state.phaseStartDate + "T00:00:00");
        const now = new Date();
        const dayNumber =
          Math.floor(
            (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

        const totalDays = phase.durationWeeks
          ? phase.durationWeeks * 7
          : null;
        const daysRemaining = totalDays ? totalDays - dayNumber : null;

        currentPhase = {
          id: phase.id,
          name: phase.name,
          slug: phase.slug,
          phaseOrder: phase.phaseOrder,
          totalPhases: allPhases.length,
          durationWeeks: phase.durationWeeks,
          description: phase.description,
          guidance: phase.guidance,
          dayNumber,
          daysRemaining: daysRemaining !== null ? Math.max(0, daysRemaining) : null,
        };
      }
    }
  }

  // Get applicable rules: protocol-wide (phaseId IS NULL) + phase-specific
  const rules = await getPhaseSpecificRules(protocolId, phaseId);

  return {
    protocolId: protocol.id,
    protocolName: protocol.name,
    hasPhases: protocol.hasPhases ?? false,
    currentPhase,
    rules,
  };
}

/**
 * Get merged rules: protocol-wide (phaseId=null) + phase-specific.
 */
export async function getPhaseSpecificRules(
  protocolId: string,
  phaseId: string | null
) {
  const conditions = [eq(protocolRules.protocolId, protocolId)];

  if (phaseId) {
    // Rules with no phase (apply to all) + rules specific to this phase
    conditions.push(
      or(isNull(protocolRules.phaseId), eq(protocolRules.phaseId, phaseId))!
    );
  } else {
    // Only protocol-wide rules
    conditions.push(isNull(protocolRules.phaseId));
  }

  const rules = await db
    .select({
      ruleType: protocolRules.ruleType,
      propertyName: protocolRules.propertyName,
      propertyValues: protocolRules.propertyValues,
      status: protocolRules.status,
      notes: protocolRules.notes,
    })
    .from(protocolRules)
    .where(and(...conditions))
    .orderBy(asc(protocolRules.ruleOrder));

  return rules;
}

/**
 * Advance the user to the next phase of their protocol.
 * Returns the new phase info, or null if already on the last phase.
 */
export async function advancePhase(userId: string, protocolId: string) {
  // Get current state
  const [state] = await db
    .select()
    .from(userProtocolState)
    .where(
      and(
        eq(userProtocolState.userId, userId),
        eq(userProtocolState.protocolId, protocolId)
      )
    )
    .limit(1);

  if (!state) return null;

  // Get all phases in order
  const phases = await db
    .select()
    .from(protocolPhases)
    .where(eq(protocolPhases.protocolId, protocolId))
    .orderBy(asc(protocolPhases.phaseOrder));

  if (phases.length === 0) return null;

  // Find current phase index
  const currentIdx = phases.findIndex((p) => p.id === state.currentPhaseId);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= phases.length) {
    // Already on the last phase
    return null;
  }

  const nextPhase = phases[nextIdx];
  const today = new Date().toISOString().split("T")[0];
  const expectedEnd = nextPhase.durationWeeks
    ? new Date(
        Date.now() + nextPhase.durationWeeks * 7 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0]
    : null;

  await db
    .update(userProtocolState)
    .set({
      currentPhaseId: nextPhase.id,
      phaseStartDate: today,
      expectedEndDate: expectedEnd,
      updatedAt: new Date(),
    })
    .where(eq(userProtocolState.id, state.id));

  return nextPhase;
}

/**
 * Evaluate a food's compliance status for a specific protocol and phase.
 */
export async function getFoodStatusForPhase(
  foodId: string,
  protocolId: string,
  phaseId: string | null
): Promise<string> {
  // Check direct override first
  const [override] = await db
    .select({ status: protocolFoodOverrides.status })
    .from(protocolFoodOverrides)
    .where(
      and(
        eq(protocolFoodOverrides.protocolId, protocolId),
        eq(protocolFoodOverrides.foodId, foodId)
      )
    )
    .limit(1);

  if (override) return override.status;

  // Get food with category and trigger properties
  const [food] = await db
    .select({
      id: foods.id,
      categoryName: foodCategories.name,
      triggerProperties: {
        oxalate: foodTriggerProperties.oxalate,
        histamine: foodTriggerProperties.histamine,
        lectin: foodTriggerProperties.lectin,
        nightshade: foodTriggerProperties.nightshade,
        histamine_liberator: foodTriggerProperties.histamineLiberator,
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

  if (!food) return "unknown";

  // Get phase-aware rules
  const rules = await getPhaseSpecificRules(protocolId, phaseId);

  const props = food.triggerProperties;
  if (!props) return "unknown";

  let status = "allowed";

  for (const rule of rules) {
    if (
      rule.ruleType === "property" &&
      rule.propertyName &&
      rule.propertyValues
    ) {
      const propValue = (props as Record<string, unknown>)[rule.propertyName];
      if (propValue !== undefined && propValue !== null) {
        const strValue = String(propValue);
        if (rule.propertyValues.includes(strValue)) {
          if (rule.status === "avoid") {
            return "avoid";
          } else if (rule.status === "caution" && status !== "avoid") {
            status = "caution";
          }
        }
      }
    } else if (rule.ruleType === "category" && rule.propertyValues) {
      if (rule.propertyValues.includes(food.categoryName)) {
        if (rule.status === "avoid") {
          return "avoid";
        } else if (rule.status === "caution" && status !== "avoid") {
          status = "caution";
        } else if (rule.status === "allowed") {
          status = "allowed";
        }
      }
    }
  }

  return status;
}
