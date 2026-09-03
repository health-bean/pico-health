import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { foodTriggerProperties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

const levels = z.enum(["low", "moderate", "high", "very_high", "unknown"]);
const fodmapLevels = z.enum(["low", "moderate", "high", "unknown"]);

const correctionsSchema = z
  .object({
    oxalate: levels.optional(),
    histamine: levels.optional(),
    lectin: levels.optional(),
    nightshade: z.boolean().optional(),
    fodmap: fodmapLevels.optional(),
    salicylate: levels.optional(),
    amines: levels.optional(),
    glutamates: levels.optional(),
    sulfites: levels.optional(),
    goitrogens: levels.optional(),
    purines: levels.optional(),
    phytoestrogens: levels.optional(),
    phytates: levels.optional(),
    tyramine: levels.optional(),
  })
  .strict();

const reviewSchema = z.object({
  reviewedBy: z.string().min(2).max(120),
  corrections: correctionsSchema.optional(),
});

// POST /api/admin/foods/[id]/review
// Applies optional property corrections, then marks the food's trigger
// properties as practitioner_reviewed. 404 if the food has no property row.
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: foodId } = await params;

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(foodTriggerProperties)
      .where(eq(foodTriggerProperties.foodId, foodId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "This food has no trigger properties row to review" },
        { status: 404 }
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(foodTriggerProperties)
      .set({
        ...(parsed.data.corrections ?? {}),
        reviewStatus: "practitioner_reviewed",
        reviewedBy: parsed.data.reviewedBy,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(foodTriggerProperties.foodId, foodId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    log.error("POST /api/admin/foods/[id]/review error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
