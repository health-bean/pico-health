import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodMeasurements, foodPropertyReviews, foods, trustedSources } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import { computeRating, type RatingResult } from "@/lib/food-data/compute";
import type { FoodProperty } from "@/lib/sources/properties";

export interface FoodDataRow {
  foodId: string;
  foodName: string;
  property: FoodProperty;
  total: number;
  result: RatingResult;
}

// GET /api/admin/food-data - every food + property that has lab results,
// with its computed rating and flags. The page filters and sorts.
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [rows, reviews] = await Promise.all([
      db
        .select({
          id: foodMeasurements.id,
          foodId: foodMeasurements.foodId,
          foodName: foods.displayName,
          servingGrams: foods.servingGrams,
          property: foodMeasurements.property,
          valuePer100g: foodMeasurements.valuePer100g,
          reportedLevel: foodMeasurements.reportedLevel,
          studyYear: foodMeasurements.studyYear,
          excluded: foodMeasurements.excluded,
          updatedAt: foodMeasurements.updatedAt,
          sourceUse: trustedSources.useAs,
        })
        .from(foodMeasurements)
        .innerJoin(foods, eq(foods.id, foodMeasurements.foodId))
        .innerJoin(trustedSources, eq(trustedSources.id, foodMeasurements.sourceId)),
      db
        .select({
          foodId: foodPropertyReviews.foodId,
          property: foodPropertyReviews.property,
          reviewedAt: foodPropertyReviews.reviewedAt,
        })
        .from(foodPropertyReviews),
    ]);

    const reviewed = new Map(reviews.map((r) => [`${r.foodId}:${r.property}`, r.reviewedAt]));
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.foodId}:${r.property}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }

    const items: FoodDataRow[] = [...groups.entries()].map(([key, group]) => {
      const first = group[0];
      const property = first.property as FoodProperty;
      return {
        foodId: first.foodId,
        foodName: first.foodName,
        property,
        total: group.length,
        result: computeRating({
          property,
          servingGrams: first.servingGrams,
          measurements: group,
          reviewedAt: reviewed.get(key) ?? null,
        }),
      };
    });

    items.sort((a, b) => a.foodName.localeCompare(b.foodName) || a.property.localeCompare(b.property));
    return NextResponse.json({ items });
  } catch (error) {
    log.error("GET /api/admin/food-data error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
