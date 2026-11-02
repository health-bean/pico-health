import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodMeasurements, trustedSources } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  isUuid,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { updateMeasurementSchema } from "@/lib/food-data/schema";
import { recomputeFoodProperty } from "@/lib/food-data/sync";
import type { FoodProperty } from "@/lib/sources/properties";

// PATCH /api/admin/food-data/measurements/:id - edit a lab result, or exclude
// / include it. Excluding requires a note saying why. There is no delete:
// excluded results stay visible as a record of the decision.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Result not found" }, { status: 404 });

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = updateMeasurementSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const data = parsed.data;

    if (data.excluded === true && !data.exclusionNote) {
      return NextResponse.json({ error: "Say why this result is excluded" }, { status: 400 });
    }

    if (data.sourceId) {
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
    }

    const [before] = await db
      .select({ foodId: foodMeasurements.foodId, property: foodMeasurements.property })
      .from(foodMeasurements)
      .where(eq(foodMeasurements.id, id))
      .limit(1);
    if (!before) return NextResponse.json({ error: "Result not found" }, { status: 404 });

    const [measurement] = await db
      .update(foodMeasurements)
      .set({
        ...data,
        // Including a result again clears the old reason.
        ...(data.excluded === false ? { exclusionNote: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(foodMeasurements.id, id))
      .returning();

    // Re-rate the old property and, if it moved, the new one.
    await recomputeFoodProperty(before.foodId, before.property as FoodProperty);
    if (measurement.property !== before.property) {
      await recomputeFoodProperty(before.foodId, measurement.property as FoodProperty);
    }
    return NextResponse.json({ measurement });
  } catch (error) {
    log.error("PATCH /api/admin/food-data/measurements/[id] error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
