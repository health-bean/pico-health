import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  foods,
  foodSubcategories,
  foodCategories,
  foodTriggerProperties,
  protocolRules,
  protocolFoodOverrides,
  userProtocolState,
  reintroductionLog,
  timelineEntries,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

// ── Types ──────────────────────────────────────────────────────────────

interface ReintroductionRecommendation {
  foodId: string;
  foodName: string;
  category: string;
  reason: string;
  symptomFreedays: number;
  lastLoggedDate: string | null;
  priority: number;
  correlationConfidence: number;
  nutritionalValue: number;
}

// ── GET /api/reintroductions/recommendations ───────────────────────────
// Get recommended foods for reintroduction

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's active protocol
    const [protocolState] = await db
      .select({
        protocolId: userProtocolState.protocolId,
        currentPhaseId: userProtocolState.currentPhaseId,
      })
      .from(userProtocolState)
      .where(eq(userProtocolState.userId, session.userId))
      .limit(1);

    if (!protocolState) {
      return NextResponse.json({
        recommendations: [],
        message: "No active protocol found. Set up a protocol to get reintroduction recommendations.",
      });
    }

    // Get eliminated foods from protocol rules
    // Foods are eliminated if they have "avoid" status in protocol rules
    const eliminatedFoods = await getEliminatedFoods(
      protocolState.protocolId,
      protocolState.currentPhaseId
    );

    if (eliminatedFoods.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: "No eliminated foods found in your protocol.",
      });
    }

    // Get active and recent reintroductions to exclude
    const excludedFoodIds = await getExcludedFoodIds(session.userId);

    // Filter out excluded foods
    const candidateFoods = eliminatedFoods.filter(
      (food) => !excludedFoodIds.includes(food.id)
    );

    if (candidateFoods.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: "All eliminated foods have active or recent reintroductions.",
      });
    }

    // Analyze each candidate food
    const recommendations: ReintroductionRecommendation[] = [];

    for (const food of candidateFoods) {
      const analysis = await analyzeFoodForReintroduction(
        session.userId,
        food.id,
        food.displayName,
        food.category
      );

      if (analysis) {
        recommendations.push(analysis);
      }
    }

    // Sort by priority (higher is better)
    recommendations.sort((a, b) => b.priority - a.priority);

    // Return top 10 recommendations
    const topRecommendations = recommendations.slice(0, 10);

    return NextResponse.json({
      recommendations: topRecommendations,
      total: recommendations.length,
    });
  } catch (error) {
    log.error("GET /api/reintroductions/recommendations error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Helper Functions ───────────────────────────────────────────────────

/**
 * Get eliminated foods from protocol rules.
 * Returns foods that are marked as "avoid" in the protocol.
 */
async function getEliminatedFoods(
  protocolId: string,
  phaseId: string | null
): Promise<Array<{ id: string; displayName: string; category: string }>> {
  // Note: phaseId parameter reserved for future phase-aware recommendations
  void phaseId;
  // Get all "avoid" rules for the protocol
  const avoidRules = await db
    .select({
      ruleType: protocolRules.ruleType,
      propertyName: protocolRules.propertyName,
      propertyValues: protocolRules.propertyValues,
    })
    .from(protocolRules)
    .where(
      and(
        eq(protocolRules.protocolId, protocolId),
        eq(protocolRules.status, "avoid")
      )
    );

  if (avoidRules.length === 0) {
    return [];
  }

  // For simplicity, we'll query all foods and filter in memory
  // In a production system, this could be optimized with more complex SQL
  const allFoods = await db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      category: foodCategories.name,
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
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id));

  // Filter foods that match avoid rules
  const eliminatedFoods = allFoods.filter((food) => {
    for (const rule of avoidRules) {
      if (rule.ruleType === "property" && rule.propertyName && rule.propertyValues) {
        const propertyValue = food.properties?.[rule.propertyName as keyof typeof food.properties];
        if (propertyValue && rule.propertyValues.includes(String(propertyValue))) {
          return true;
        }
      } else if (rule.ruleType === "category" && rule.propertyValues) {
        if (rule.propertyValues.includes(food.category)) {
          return true;
        }
      }
    }
    return false;
  });

  // Check for protocol-specific overrides that might allow some foods
  const overrides = await db
    .select({
      foodId: protocolFoodOverrides.foodId,
      status: protocolFoodOverrides.status,
    })
    .from(protocolFoodOverrides)
    .where(eq(protocolFoodOverrides.protocolId, protocolId));

  // Filter out foods that have "allowed" overrides
  const allowedOverrideFoodIds = overrides
    .filter((o) => o.status === "allowed")
    .map((o) => o.foodId);

  return eliminatedFoods
    .filter((food) => !allowedOverrideFoodIds.includes(food.id))
    .map((food) => ({
      id: food.id,
      displayName: food.displayName,
      category: food.category,
    }));
}

/**
 * Get food IDs that should be excluded from recommendations.
 * Includes active reintroductions and recent reintroductions (within 14 days).
 */
async function getExcludedFoodIds(userId: string): Promise<string[]> {
  const reintroductions = await db
    .select({
      foodId: reintroductionLog.foodId,
      status: reintroductionLog.status,
      startDate: reintroductionLog.startDate,
    })
    .from(reintroductionLog)
    .where(
      and(
        eq(reintroductionLog.userId, userId),
        sql`(
          ${reintroductionLog.status} = 'active' 
          OR (${reintroductionLog.startDate} >= CURRENT_DATE - INTERVAL '14 days')
        )`
      )
    );

  return reintroductions
    .filter((r) => r.foodId !== null)
    .map((r) => r.foodId as string);
}

/**
 * Analyze a food for reintroduction readiness.
 * Calculates priority score based on multiple factors.
 */
async function analyzeFoodForReintroduction(
  userId: string,
  foodId: string,
  foodName: string,
  category: string
): Promise<ReintroductionRecommendation | null> {
  // Get symptom-free period (days since last symptom)
  const [lastSymptom] = await db
    .select({ entryDate: timelineEntries.entryDate })
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.userId, userId),
        eq(timelineEntries.entryType, "symptom")
      )
    )
    .orderBy(sql`${timelineEntries.entryDate} DESC`)
    .limit(1);

  const symptomFreeDays = lastSymptom
    ? Math.floor(
        (Date.now() - new Date(lastSymptom.entryDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 365; // Default to 1 year if no symptoms logged

  // Get last time this food was logged
  const [lastFoodLog] = await db
    .select({ entryDate: timelineEntries.entryDate })
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.userId, userId),
        eq(timelineEntries.entryType, "food"),
        eq(timelineEntries.foodId, foodId)
      )
    )
    .orderBy(sql`${timelineEntries.entryDate} DESC`)
    .limit(1);

  const lastLoggedDate = lastFoodLog ? lastFoodLog.entryDate : null;

  // Calculate correlation confidence (simplified - in real implementation, 
  // this would query the correlations table or run correlation analysis)
  // For now, we'll use a heuristic based on how long ago the food was eaten
  const daysSinceLastLog = lastLoggedDate
    ? Math.floor(
        (Date.now() - new Date(lastLoggedDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 365;

  // Lower correlation confidence if food was recently eaten and symptoms occurred
  const correlationConfidence =
    daysSinceLastLog > 30 && symptomFreeDays > 30 ? 0.9 : 0.5;

  // Calculate nutritional value score (simplified)
  // In a real implementation, this would use nutritional data
  const nutritionalValue = calculateNutritionalValue(category);

  // Calculate priority score
  // Factors:
  // 1. Symptom-free period (30% weight) - longer is better
  // 2. Correlation confidence (40% weight) - lower correlation with symptoms is better
  // 3. Nutritional value (30% weight) - higher is better
  const symptomFreeScore = Math.min(symptomFreeDays / 60, 1) * 30; // Max at 60 days
  const correlationScore = correlationConfidence * 40;
  const nutritionScore = nutritionalValue * 30;

  const priority = Math.round(symptomFreeScore + correlationScore + nutritionScore);

  // Generate reason text
  const reasons: string[] = [];

  if (symptomFreeDays >= 30) {
    reasons.push(`${symptomFreeDays} days symptom-free`);
  } else {
    reasons.push("Recent symptoms - consider waiting");
  }

  if (correlationConfidence > 0.7) {
    reasons.push("low symptom correlation");
  } else {
    reasons.push("insufficient data for correlation");
  }

  if (nutritionalValue > 0.7) {
    reasons.push("high nutritional value");
  }

  const reason = reasons.join(", ");

  return {
    foodId,
    foodName,
    category,
    reason,
    symptomFreedays: symptomFreeDays,
    lastLoggedDate,
    priority,
    correlationConfidence,
    nutritionalValue,
  };
}

/**
 * Calculate nutritional value score for a food category.
 * This is a simplified heuristic - in a real implementation,
 * this would use actual nutritional data.
 */
function calculateNutritionalValue(category: string): number {
  const highValue = [
    "Vegetables",
    "Fruits",
    "Meat & Poultry",
    "Nuts & Seeds",
    "Legumes",
    "Fish & Seafood",
  ];
  const mediumValue = [
    "Grains",
    "Dairy",
    "Eggs",
    "Fats & Oils",
  ];

  if (highValue.some((c) => category.includes(c))) {
    return 0.9;
  } else if (mediumValue.some((c) => category.includes(c))) {
    return 0.6;
  } else {
    return 0.4;
  }
}
