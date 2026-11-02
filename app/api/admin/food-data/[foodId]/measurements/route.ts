import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodMeasurements, foods, trustedSources } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  isUuid,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { createMeasurementSchema } from "@/lib/food-data/schema";
import { recomputeFoodProperty } from "@/lib/food-data/sync";
import type { FoodProperty } from "@/lib/sources/properties";

// POST /api/admin/food-data/:foodId/measurements - add one lab result.
// The source must be an active trusted source marked "data source".
export async function POST(request: Request, { params }: { params: Promise<{ foodId: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { foodId } = await params;
    if (!isUuid(foodId)) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = createMeasurementSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const data = parsed.data;

    const [food] = await db.select({ id: foods.id }).from(foods).where(eq(foods.id, foodId)).limit(1);
    if (!food) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    const [source] = await db
      .select({ isActive: trustedSources.isActive, useAs: trustedSources.useAs })
      .from(trustedSources)
      .where(eq(trustedSources.id, data.sourceId))
      .limit(1);
    if (!source || !source.isActive || source.useAs !== "data") {
      return NextResponse.json(
        { error: "Choose an active trusted source marked as a data source" },
        { status: 400 }
      );
    }

    const [measurement] = await db
      .insert(foodMeasurements)
      .values({
        foodId,
        property: data.property,
        valuePer100g: data.valuePer100g ?? null,
        unit: data.unit,
        reportedLevel: data.reportedLevel ?? null,
        solublePct: data.solublePct ?? null,
        preparation: data.preparation,
        sampleDescription: data.sampleDescription,
        sourceId: data.sourceId,
        citation: data.citation,
        citationUrl: data.citationUrl ?? null,
        studyYear: data.studyYear ?? null,
        createdBy: auth.session.email || auth.session.userId,
      })
      .returning();

    const { result } = await recomputeFoodProperty(foodId, data.property as FoodProperty);
    return NextResponse.json({ measurement, result }, { status: 201 });
  } catch (error) {
    log.error("POST /api/admin/food-data/[foodId]/measurements error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
