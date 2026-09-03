import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  foods,
  foodCategories,
  foodSubcategories,
  foodTriggerProperties,
} from "@/lib/db/schema";
import { eq, ilike, asc } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session.userId) return { error: "Unauthorized", status: 401 };
  if (!session.isAdmin) return { error: "Forbidden", status: 403 };
  return { session };
}

// GET /api/admin/foods - List all foods with trigger properties + provenance
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";

    let query = db
      .select({
        id: foods.id,
        displayName: foods.displayName,
        isCommon: foods.isCommon,
        categoryName: foodCategories.name,
        subcategoryName: foodSubcategories.name,
        categoryId: foodCategories.id,
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
        sources: foodTriggerProperties.sources,
        reviewStatus: foodTriggerProperties.reviewStatus,
        reviewedBy: foodTriggerProperties.reviewedBy,
      })
      .from(foods)
      .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
      .innerJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
      .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
      .orderBy(asc(foodCategories.name), asc(foods.displayName))
      .$dynamic();

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.where(ilike(foods.displayName, `%${escaped}%`));
    }

    if (category) {
      query = query.where(eq(foodCategories.name, category));
    }

    const results = await query;

    // Also get categories for the filter
    const categories = await db
      .select({ id: foodCategories.id, name: foodCategories.name })
      .from(foodCategories)
      .orderBy(asc(foodCategories.name));

    return NextResponse.json({ foods: results, categories });
  } catch (error) {
    log.error("GET /api/admin/foods error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const citationSchema = z.object({
  source: z.string().min(1).max(200),
  ref: z.string().max(500).optional(),
});

const patchFoodSchema = z.object({
  foodId: z.string().uuid(),
  property: z.enum([
    "oxalate", "histamine", "lectin", "nightshade", "fodmap",
    "salicylate", "amines", "glutamates", "sulfites", "goitrogens",
    "purines", "phytoestrogens", "phytates", "tyramine",
  ]),
  value: z.union([z.string(), z.boolean()]),
  // Optional here ONLY: manual admin-console edits default to the founder
  // source below. The AI agent path (lib/ai/admin-extract) requires real
  // citations and marks rows ai_proposed instead.
  sources: z.record(z.string(), citationSchema).optional(),
});

const DEFAULT_FOUNDER_SOURCE = {
  source: "Founder/manual",
  ref: "admin console edit",
};

// PATCH /api/admin/foods - Update a food's trigger property (manual console
// edit: review_status becomes founder_set, source defaults to Founder/manual)
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = patchFoodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { foodId, property, value, sources } = parsed.data;

    const citation =
      sources?.[property] ?? sources?.default ?? DEFAULT_FOUNDER_SOURCE;

    // Check if trigger row exists
    const [existing] = await db
      .select({
        id: foodTriggerProperties.id,
        sources: foodTriggerProperties.sources,
      })
      .from(foodTriggerProperties)
      .where(eq(foodTriggerProperties.foodId, foodId))
      .limit(1);

    if (existing) {
      await db
        .update(foodTriggerProperties)
        .set({
          [property]: value,
          sources: { ...(existing.sources ?? {}), [property]: citation },
          reviewStatus: "founder_set",
          updatedAt: new Date(),
        })
        .where(eq(foodTriggerProperties.foodId, foodId));
    } else {
      await db.insert(foodTriggerProperties).values({
        foodId,
        [property]: value,
        sources: { [property]: citation },
        reviewStatus: "founder_set",
      });
    }

    return NextResponse.json({ success: true, reviewStatus: "founder_set" });
  } catch (error) {
    log.error("PATCH /api/admin/foods error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
