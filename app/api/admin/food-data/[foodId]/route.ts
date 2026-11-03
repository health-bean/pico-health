import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  foodCategories,
  foodMeasurements,
  foodPropertyReviews,
  foodSubcategories,
  foods,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  isUuid,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { computeRating } from "@/lib/food-data/compute";
import { MEASURED_PROPERTIES, updateServingSchema } from "@/lib/food-data/schema";
import { loadMeasurements, recomputeFoodProperty } from "@/lib/food-data/sync";
import type { FoodProperty } from "@/lib/sources/properties";

type Params = { params: Promise<{ foodId: string }> };

async function loadFood(foodId: string) {
  const [food] = await db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      servingGrams: foods.servingGrams,
      servingLabel: foods.servingLabel,
      category: foodCategories.name,
      subcategory: foodSubcategories.name,
    })
    .from(foods)
    .leftJoin(foodSubcategories, eq(foodSubcategories.id, foods.subcategoryId))
    .leftJoin(foodCategories, eq(foodCategories.id, foodSubcategories.categoryId))
    .where(eq(foods.id, foodId))
    .limit(1);
  return food ?? null;
}

/** Properties of this food that have at least one stored result. */
async function measuredPropertiesOf(foodId: string): Promise<FoodProperty[]> {
  const rows = await db
    .selectDistinct({ property: foodMeasurements.property })
    .from(foodMeasurements)
    .where(eq(foodMeasurements.foodId, foodId));
  return rows.map((r) => r.property as FoodProperty);
}

// GET /api/admin/food-data/:foodId - the food, and for every measured
// property: each lab result, the computed rating, and the last sign-off.
export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { foodId } = await params;
    if (!isUuid(foodId)) return NextResponse.json({ error: "Food not found" }, { status: 404 });
    const food = await loadFood(foodId);
    if (!food) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    const reviews = await db
      .select()
      .from(foodPropertyReviews)
      .where(eq(foodPropertyReviews.foodId, foodId));

    const properties = await Promise.all(
      MEASURED_PROPERTIES.map(async (property) => {
        const measurements = await loadMeasurements(foodId, property);
        if (measurements.length === 0) return null;
        measurements.sort((a, b) => (b.studyYear ?? 0) - (a.studyYear ?? 0));
        const review = reviews.find((r) => r.property === property) ?? null;
        const result = computeRating({
          property,
          servingGrams: food.servingGrams,
          measurements,
          reviewedAt: review?.reviewedAt ?? null,
          overrideLevel: review?.overrideLevel ?? null,
          category: food.category,
        });
        return { property, measurements, result, review };
      })
    );

    return NextResponse.json({ food, properties: properties.filter(Boolean) });
  } catch (error) {
    log.error("GET /api/admin/food-data/[foodId] error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/food-data/:foodId - set the serving size, then re-rank
// every measured property (per-serving ranks depend on it).
export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { foodId } = await params;
    if (!isUuid(foodId)) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = updateServingSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [updated] = await db
      .update(foods)
      .set(parsed.data)
      .where(eq(foods.id, foodId))
      .returning({ id: foods.id });
    if (!updated) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    for (const property of await measuredPropertiesOf(foodId)) {
      await recomputeFoodProperty(foodId, property);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("PATCH /api/admin/food-data/[foodId] error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

