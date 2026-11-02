import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodPropertyReviews } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  isUuid,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { reviewSchema } from "@/lib/food-data/schema";
import { recomputeFoodProperty } from "@/lib/food-data/sync";
import type { FoodProperty } from "@/lib/sources/properties";

// POST /api/admin/food-data/:foodId/review - sign off on a food + property
// ("I've looked at the studies; this rating stands"). Replaces any earlier
// sign-off and clears "needs review" until the results change again.
export async function POST(request: Request, { params }: { params: Promise<{ foodId: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { foodId } = await params;
    if (!isUuid(foodId)) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const values = {
      foodId,
      property: parsed.data.property,
      note: parsed.data.note,
      reviewedBy: auth.session.email || auth.session.userId,
      reviewedAt: new Date(),
    };
    await db
      .insert(foodPropertyReviews)
      .values(values)
      .onConflictDoUpdate({
        target: [foodPropertyReviews.foodId, foodPropertyReviews.property],
        set: { note: values.note, reviewedBy: values.reviewedBy, reviewedAt: values.reviewedAt },
      });

    const { result } = await recomputeFoodProperty(foodId, parsed.data.property as FoodProperty);
    return NextResponse.json({ result });
  } catch (error) {
    log.error("POST /api/admin/food-data/[foodId]/review error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
