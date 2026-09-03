import { db } from "@/lib/db";
import {
  foods,
  foodCategories,
  foodSubcategories,
  foodTriggerProperties,
  protocols,
  protocolFoodOverrides,
} from "@/lib/db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import type {
  SearchFoodsInput,
  GetFoodDetailsInput,
  UpdateFoodTriggersInput,
  AddFoodInput,
  DeleteFoodInput,
  BulkUpdateCategoryInput,
  SourceCitation,
} from "./types";

type ResolvedCitations =
  | { citations: Record<string, SourceCitation> }
  | { missing: string[] };

/**
 * Every AI-proposed property value must carry a citation. A "default" key
 * may cover any property that lacks its own entry.
 */
function resolveCitations(
  sources: Record<string, SourceCitation> | undefined,
  properties: string[]
): ResolvedCitations {
  const missing: string[] = [];
  const citations: Record<string, SourceCitation> = {};
  for (const prop of properties) {
    const entry = sources?.[prop] ?? sources?.default;
    if (!entry || typeof entry.source !== "string" || entry.source.trim().length === 0) {
      missing.push(prop);
    } else {
      citations[prop] = { source: entry.source, ...(entry.ref ? { ref: entry.ref } : {}) };
    }
  }
  return missing.length > 0 ? { missing } : { citations };
}

function citationError(missing: string[]) {
  return {
    error:
      `Missing source citations for: ${missing.join(", ")}. ` +
      'Include a "sources" object with one entry per updated property (or a "default" entry covering all of them), ' +
      "each shaped { source, ref? } and naming the framework you actually consulted - e.g. SIGHI for histamine/amines, " +
      "RPAH/FAILSAFE for salicylates/amines/glutamates, Harvard or Trying Low Oxalates lists for oxalate, published " +
      "FODMAP lists, or botanical/compositional classification. Never invent a citation - if you have no real source, " +
      "say so instead of writing the value.",
  };
}

export async function handleSearchFoods(input: SearchFoodsInput) {
  const limit = input.limit ?? 20;

  const results = await db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      categoryName: foodCategories.name,
      subcategoryName: foodSubcategories.name,
      isCommon: foods.isCommon,
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
    })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(ilike(foods.displayName, `%${input.query}%`))
    .limit(limit);

  if (results.length === 0) {
    return { found: false, message: `No foods matching "${input.query}" found.` };
  }

  return {
    found: true,
    count: results.length,
    foods: results.map((r) => ({
      name: r.displayName,
      category: r.categoryName,
      subcategory: r.subcategoryName,
      isCommon: r.isCommon,
      triggers: {
        oxalate: r.oxalate,
        histamine: r.histamine,
        lectin: r.lectin,
        nightshade: r.nightshade,
        fodmap: r.fodmap,
        salicylate: r.salicylate,
        amines: r.amines,
        glutamates: r.glutamates,
        sulfites: r.sulfites,
        goitrogens: r.goitrogens,
        purines: r.purines,
        phytoestrogens: r.phytoestrogens,
        phytates: r.phytates,
        tyramine: r.tyramine,
      },
    })),
  };
}

export async function handleGetFoodDetails(input: GetFoodDetailsInput) {
  const [food] = await db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      categoryName: foodCategories.name,
      subcategoryName: foodSubcategories.name,
      isCommon: foods.isCommon,
      displayOrder: foods.displayOrder,
      createdAt: foods.createdAt,
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
    })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(ilike(foods.displayName, input.food_name))
    .limit(1);

  if (!food) {
    return { found: false, message: `Food "${input.food_name}" not found.` };
  }

  const overrides = await db
    .select({
      protocolName: protocols.name,
      status: protocolFoodOverrides.status,
      overrideReason: protocolFoodOverrides.overrideReason,
      notes: protocolFoodOverrides.notes,
    })
    .from(protocolFoodOverrides)
    .innerJoin(protocols, eq(protocolFoodOverrides.protocolId, protocols.id))
    .where(eq(protocolFoodOverrides.foodId, food.id));

  return {
    found: true,
    food: {
      name: food.displayName,
      category: food.categoryName,
      subcategory: food.subcategoryName,
      isCommon: food.isCommon,
      displayOrder: food.displayOrder,
      createdAt: food.createdAt,
      triggers: {
        oxalate: food.oxalate,
        histamine: food.histamine,
        lectin: food.lectin,
        nightshade: food.nightshade,
        fodmap: food.fodmap,
        salicylate: food.salicylate,
        amines: food.amines,
        glutamates: food.glutamates,
        sulfites: food.sulfites,
        goitrogens: food.goitrogens,
        purines: food.purines,
        phytoestrogens: food.phytoestrogens,
        phytates: food.phytates,
        tyramine: food.tyramine,
      },
      protocolOverrides: overrides.map((o) => ({
        protocol: o.protocolName,
        status: o.status,
        reason: o.overrideReason,
        notes: o.notes,
      })),
    },
  };
}

export async function handleUpdateFoodTriggers(input: UpdateFoodTriggersInput) {
  const [food] = await db
    .select({ id: foods.id, displayName: foods.displayName })
    .from(foods)
    .where(ilike(foods.displayName, input.food_name))
    .limit(1);

  if (!food) {
    return { error: `Food "${input.food_name}" not found.` };
  }

  const [currentTriggers] = await db
    .select()
    .from(foodTriggerProperties)
    .where(eq(foodTriggerProperties.foodId, food.id))
    .limit(1);

  const propertyKeys = Object.keys(input.updates);
  if (propertyKeys.length === 0) {
    return { error: "No updates provided." };
  }

  const resolved = resolveCitations(input.sources, propertyKeys);
  if ("missing" in resolved) {
    return citationError(resolved.missing);
  }

  const mergedSources: Record<string, SourceCitation> = {
    ...(currentTriggers?.sources ?? {}),
    ...resolved.citations,
  };
  const wasPractitionerReviewed =
    currentTriggers?.reviewStatus === "practitioner_reviewed";

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (currentTriggers) {
    for (const [key, newValue] of Object.entries(input.updates)) {
      const currentValue = currentTriggers[key as keyof typeof currentTriggers];
      before[key] = currentValue;
      after[key] = newValue;
    }

    await db
      .update(foodTriggerProperties)
      .set({
        ...input.updates,
        sources: mergedSources,
        reviewStatus: "ai_proposed",
        updatedAt: new Date(),
      })
      .where(eq(foodTriggerProperties.foodId, food.id));
  } else {
    for (const [key, newValue] of Object.entries(input.updates)) {
      before[key] = "unknown";
      after[key] = newValue;
    }

    await db.insert(foodTriggerProperties).values({
      foodId: food.id,
      ...input.updates,
      sources: mergedSources,
      reviewStatus: "ai_proposed",
    });
  }

  return {
    success: true,
    food: food.displayName,
    before,
    after,
    reviewStatus: "ai_proposed",
    ...(wasPractitionerReviewed
      ? {
          note: "This food was practitioner_reviewed; your edit reset it to ai_proposed pending re-review.",
        }
      : {}),
  };
}

export async function handleAddFood(input: AddFoodInput) {
  const [subcategory] = await db
    .select({ id: foodSubcategories.id, categoryId: foodSubcategories.categoryId })
    .from(foodSubcategories)
    .where(ilike(foodSubcategories.name, input.subcategory))
    .limit(1);

  if (!subcategory) {
    return { error: `Subcategory "${input.subcategory}" not found. Use an existing subcategory name.` };
  }

  const [existing] = await db
    .select({ id: foods.id })
    .from(foods)
    .where(ilike(foods.displayName, input.name))
    .limit(1);

  if (existing) {
    return { error: `Food "${input.name}" already exists in the database.` };
  }

  const resolved = resolveCitations(input.sources, Object.keys(input.triggers));
  if ("missing" in resolved) {
    return citationError(resolved.missing);
  }

  const [newFood] = await db
    .insert(foods)
    .values({
      displayName: input.name,
      subcategoryId: subcategory.id,
      isCommon: input.is_common,
    })
    .returning({ id: foods.id, displayName: foods.displayName });

  await db.insert(foodTriggerProperties).values({
    foodId: newFood.id,
    oxalate: input.triggers.oxalate ?? "unknown",
    histamine: input.triggers.histamine ?? "unknown",
    lectin: input.triggers.lectin ?? "unknown",
    nightshade: input.triggers.nightshade ?? false,
    fodmap: input.triggers.fodmap ?? "unknown",
    salicylate: input.triggers.salicylate ?? "unknown",
    amines: input.triggers.amines ?? "unknown",
    glutamates: input.triggers.glutamates ?? "unknown",
    sulfites: input.triggers.sulfites ?? "unknown",
    goitrogens: input.triggers.goitrogens ?? "unknown",
    purines: input.triggers.purines ?? "unknown",
    phytoestrogens: input.triggers.phytoestrogens ?? "unknown",
    phytates: input.triggers.phytates ?? "unknown",
    tyramine: input.triggers.tyramine ?? "unknown",
    sources: resolved.citations,
    reviewStatus: "ai_proposed",
  });

  return {
    success: true,
    food: {
      id: newFood.id,
      name: newFood.displayName,
      subcategory: input.subcategory,
      isCommon: input.is_common,
      triggers: input.triggers,
    },
  };
}

export async function handleDeleteFood(input: DeleteFoodInput) {
  const [food] = await db
    .select({ id: foods.id, displayName: foods.displayName })
    .from(foods)
    .where(ilike(foods.displayName, input.food_name))
    .limit(1);

  if (!food) {
    return { error: `Food "${input.food_name}" not found.` };
  }

  await db.delete(foods).where(eq(foods.id, food.id));

  return { success: true, message: `Deleted "${food.displayName}" and its trigger properties.` };
}

export async function handleBulkUpdateCategory(input: BulkUpdateCategoryInput) {
  if (!input.category && !input.subcategory) {
    return { error: "Either category or subcategory must be provided." };
  }

  let foodIds: string[];

  if (input.subcategory) {
    const [sub] = await db
      .select({ id: foodSubcategories.id })
      .from(foodSubcategories)
      .where(ilike(foodSubcategories.name, input.subcategory))
      .limit(1);

    if (!sub) {
      return { error: `Subcategory "${input.subcategory}" not found.` };
    }

    const matchingFoods = await db
      .select({ id: foods.id })
      .from(foods)
      .where(eq(foods.subcategoryId, sub.id));

    foodIds = matchingFoods.map((f) => f.id);
  } else {
    const [cat] = await db
      .select({ id: foodCategories.id })
      .from(foodCategories)
      .where(ilike(foodCategories.name, input.category!))
      .limit(1);

    if (!cat) {
      return { error: `Category "${input.category}" not found.` };
    }

    const subs = await db
      .select({ id: foodSubcategories.id })
      .from(foodSubcategories)
      .where(eq(foodSubcategories.categoryId, cat.id));

    const subIds = subs.map((s) => s.id);

    if (subIds.length === 0) {
      return { error: `No subcategories found in category "${input.category}".` };
    }

    const matchingFoods = await db
      .select({ id: foods.id })
      .from(foods)
      .where(sql`${foods.subcategoryId} = ANY(${subIds})`);

    foodIds = matchingFoods.map((f) => f.id);
  }

  if (foodIds.length === 0) {
    return {
      error: `No foods found in the specified ${input.subcategory ? "subcategory" : "category"}.`,
    };
  }

  const updateValue =
    input.property === "nightshade" ? input.value === "true" : input.value;

  let updatedCount = 0;

  for (const foodId of foodIds) {
    const [existing] = await db
      .select({ id: foodTriggerProperties.id })
      .from(foodTriggerProperties)
      .where(eq(foodTriggerProperties.foodId, foodId))
      .limit(1);

    if (existing) {
      await db
        .update(foodTriggerProperties)
        .set({
          [input.property]: updateValue,
          reviewStatus: "ai_proposed",
          updatedAt: new Date(),
        })
        .where(eq(foodTriggerProperties.foodId, foodId));
    } else {
      await db.insert(foodTriggerProperties).values({
        foodId,
        [input.property]: updateValue,
        reviewStatus: "ai_proposed",
      });
    }

    updatedCount++;
  }

  return {
    success: true,
    message: `Updated ${input.property} to "${input.value}" for ${updatedCount} foods in ${input.subcategory ? `subcategory "${input.subcategory}"` : `category "${input.category}"`}.`,
    count: updatedCount,
  };
}
