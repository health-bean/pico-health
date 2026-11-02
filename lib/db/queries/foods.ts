import { db } from "@/lib/db";
import {
  foods,
  foodCategories,
  foodSubcategories,
  foodTriggerProperties,
  customFoods,
  customFoodProperties,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { searchUsda } from "@/lib/usda/client";
import { log } from "@/lib/logger";

/**
 * Food search result interface
 */
export interface FoodSearchResult {
  id: string;
  displayName: string;
  category: string;
  subcategory: string;
  isCustom: boolean;
  source: "curated" | "usda" | "custom";
  hasTriggerData: boolean;
  properties: {
    oxalate?: string;
    histamine?: string;
    lectin?: string;
    nightshade?: boolean;
    histamine_liberator?: boolean;
    fodmap?: string;
    salicylate?: string;
    amines?: string;
    glutamates?: string;
    sulfites?: string;
    goitrogens?: string;
    purines?: string;
    phytoestrogens?: string;
    phytates?: string;
    tyramine?: string;
  };
}

const EMPTY_PROPERTIES = {
  oxalate: undefined,
  histamine: undefined,
  lectin: undefined,
  nightshade: undefined,
  fodmap: undefined,
  salicylate: undefined,
  amines: undefined,
  glutamates: undefined,
  sulfites: undefined,
  goitrogens: undefined,
  purines: undefined,
  phytoestrogens: undefined,
  phytates: undefined,
  tyramine: undefined,
};

/** Check if a properties object has any real (non-null, non-"unknown") trigger data */
function hasRealTriggerData(props: Record<string, unknown> | null | undefined): boolean {
  if (!props) return false;
  return Object.entries(props).some(([, v]) => v != null && v !== "unknown");
}

/**
 * Search foods using fuzzy matching with pg_trgm.
 *
 * Searches local curated foods + custom foods first. If results are
 * below `limit`, fans out to USDA FoodData Central and caches any
 * new foods into the local DB for future searches.
 */
export async function searchFoods(
  query: string,
  userId: string,
  limit: number = 10
): Promise<FoodSearchResult[]> {
  const maxResults = Math.min(limit, 10);

  // Search standard foods with similarity matching
  const standardFoodsQuery = db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      category: foodCategories.name,
      subcategory: foodSubcategories.name,
      isCustom: sql<boolean>`false`,
      source: foods.source,
      similarity: sql<number>`similarity(${foods.displayName}, ${query})`,
      properties: {
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
    .where(sql`similarity(${foods.displayName}, ${query}) > 0.3`)
    .orderBy(sql`similarity(${foods.displayName}, ${query}) DESC`)
    .limit(maxResults);

  // Search custom foods with similarity matching
  const customFoodsQuery = db
    .select({
      id: customFoods.id,
      displayName: customFoods.displayName,
      category: customFoods.category,
      subcategory: customFoods.subcategory,
      isCustom: sql<boolean>`true`,
      source: sql<string>`'custom'`,
      similarity: sql<number>`similarity(${customFoods.displayName}, ${query})`,
      properties: {
        oxalate: customFoodProperties.oxalate,
        histamine: customFoodProperties.histamine,
        lectin: customFoodProperties.lectin,
        nightshade: customFoodProperties.nightshade,
        fodmap: customFoodProperties.fodmap,
        salicylate: customFoodProperties.salicylate,
        amines: customFoodProperties.amines,
        glutamates: customFoodProperties.glutamates,
        sulfites: customFoodProperties.sulfites,
        goitrogens: customFoodProperties.goitrogens,
        purines: customFoodProperties.purines,
        phytoestrogens: customFoodProperties.phytoestrogens,
        phytates: customFoodProperties.phytates,
        tyramine: customFoodProperties.tyramine,
      },
    })
    .from(customFoods)
    .leftJoin(
      customFoodProperties,
      eq(customFoodProperties.customFoodId, customFoods.id)
    )
    .where(
      and(
        eq(customFoods.userId, userId),
        eq(customFoods.isArchived, false),
        sql`similarity(${customFoods.displayName}, ${query}) > 0.3`
      )
    )
    .orderBy(sql`similarity(${customFoods.displayName}, ${query}) DESC`)
    .limit(maxResults);

  // Execute both queries in parallel
  const [standardResults, customResults] = await Promise.all([
    standardFoodsQuery,
    customFoodsQuery,
  ]);

  // Merge results and sort by similarity score (highest first)
  const localResults = [...standardResults, ...customResults]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  // If we have enough local results, skip USDA
  const localFormatted = localResults.map((result) => formatResult(result));
  if (localFormatted.length >= maxResults) {
    return localFormatted;
  }

  // Fan out to USDA for additional results
  const remaining = maxResults - localFormatted.length;
  try {
    const usdaResults = await searchUsda(query, remaining + 5); // fetch extra to deduplicate

    // Filter out USDA results that already exist locally (by fdcId or similar name)
    const localNames = new Set(
      localFormatted.map((r) => r.displayName.toLowerCase())
    );

    const newUsdaFoods = usdaResults.filter(
      (u) => !localNames.has(u.description.toLowerCase())
    );

    // Cache new USDA foods into DB
    const usdaCached = await cacheUsdaFoods(newUsdaFoods.slice(0, remaining));

    return [...localFormatted, ...usdaCached].slice(0, maxResults);
  } catch (err) {
    log.warn("USDA search fallback failed, returning local results only", {
      error: err,
    });
    return localFormatted;
  }
}

/**
 * Cache USDA foods into the local foods table.
 * Uses ON CONFLICT to avoid duplicates by usda_fdc_id.
 */
async function cacheUsdaFoods(
  usdaFoods: Array<{
    fdcId: number;
    description: string;
    foodCategory?: string;
  }>
): Promise<FoodSearchResult[]> {
  if (usdaFoods.length === 0) return [];

  // Get the USDA catch-all subcategory
  const [usdaSubcat] = await db
    .select({ id: foodSubcategories.id })
    .from(foodSubcategories)
    .innerJoin(
      foodCategories,
      eq(foodSubcategories.categoryId, foodCategories.id)
    )
    .where(eq(foodCategories.name, "USDA Foods"))
    .limit(1);

  if (!usdaSubcat) {
    log.warn("USDA Foods category not found in DB — run the migration");
    return usdaFoods.map((u) => ({
      id: "",
      displayName: formatUsdaName(u.description),
      category: u.foodCategory || "USDA Foods",
      subcategory: "Uncategorized",
      isCustom: false,
      source: "usda" as const,
      hasTriggerData: false,
      properties: { ...EMPTY_PROPERTIES },
    }));
  }

  const results: FoodSearchResult[] = [];

  for (const uf of usdaFoods) {
    try {
      const [inserted] = await db
        .insert(foods)
        .values({
          displayName: formatUsdaName(uf.description),
          subcategoryId: usdaSubcat.id,
          source: "usda",
          usdaFdcId: uf.fdcId,
        })
        .onConflictDoNothing()
        .returning({ id: foods.id });

      // If conflict (already cached), look up the existing row
      let foodId = inserted?.id;
      if (!foodId) {
        const [existing] = await db
          .select({ id: foods.id })
          .from(foods)
          .where(eq(foods.usdaFdcId, uf.fdcId))
          .limit(1);
        foodId = existing?.id;
      }

      if (foodId) {
        results.push({
          id: foodId,
          displayName: formatUsdaName(uf.description),
          category: uf.foodCategory || "USDA Foods",
          subcategory: "Uncategorized",
          isCustom: false,
          source: "usda",
          hasTriggerData: false,
          properties: { ...EMPTY_PROPERTIES },
        });
      }
    } catch (err) {
      log.warn("Failed to cache USDA food", {
        fdcId: uf.fdcId,
        error: err,
      });
    }
  }

  return results;
}

/**
 * Clean up USDA descriptions — they tend to be ALL CAPS or have extra info.
 * "CHICKEN BREAST, SKINLESS, BONELESS" → "Chicken Breast, Skinless, Boneless"
 */
function formatUsdaName(description: string): string {
  return description
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s*,\s*upc:.*$/i, "") // remove UPC codes
    .trim();
}

function formatResult(result: {
  id: string;
  displayName: string;
  category: string | null;
  subcategory: string | null;
  isCustom: boolean;
  source: string | null;
  properties: Record<string, unknown> | null;
}): FoodSearchResult {
  const source = result.isCustom
    ? "custom"
    : (result.source as "curated" | "usda") || "curated";

  return {
    id: result.id,
    displayName: result.displayName,
    category: result.category || "",
    subcategory: result.subcategory || "",
    isCustom: result.isCustom,
    source,
    hasTriggerData: hasRealTriggerData(result.properties),
    properties: result.properties
      ? {
          oxalate: (result.properties.oxalate as string) || undefined,
          histamine: (result.properties.histamine as string) || undefined,
          lectin: (result.properties.lectin as string) || undefined,
          // Keep false: "not a nightshade" is a fact, not a missing rating.
          nightshade: (result.properties.nightshade as boolean | null) ?? undefined,
          histamine_liberator: (result.properties.histamine_liberator as boolean | null) ?? undefined,
          fodmap: (result.properties.fodmap as string) || undefined,
          salicylate: (result.properties.salicylate as string) || undefined,
          amines: (result.properties.amines as string) || undefined,
          glutamates: (result.properties.glutamates as string) || undefined,
          sulfites: (result.properties.sulfites as string) || undefined,
          goitrogens: (result.properties.goitrogens as string) || undefined,
          purines: (result.properties.purines as string) || undefined,
          phytoestrogens:
            (result.properties.phytoestrogens as string) || undefined,
          phytates: (result.properties.phytates as string) || undefined,
          tyramine: (result.properties.tyramine as string) || undefined,
        }
      : { ...EMPTY_PROPERTIES },
  };
}
