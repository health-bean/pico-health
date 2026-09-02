import { NextResponse } from "next/server";
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

// GET /api/admin/foods - List all foods with trigger properties
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

// PATCH /api/admin/foods - Update a food's trigger property
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ALLOWED_PROPERTIES = new Set([
      "oxalate", "histamine", "lectin", "nightshade", "fodmap",
      "salicylate", "amines", "glutamates", "sulfites", "goitrogens",
      "purines", "phytoestrogens", "phytates", "tyramine",
    ]);

    const body = await request.json();
    const { foodId, property, value } = body as {
      foodId: string;
      property: string;
      value: string | boolean;
    };

    if (!foodId || !property) {
      return NextResponse.json(
        { error: "foodId and property are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_PROPERTIES.has(property)) {
      return NextResponse.json(
        { error: `Invalid property: ${property}` },
        { status: 400 }
      );
    }

    // Check if trigger row exists
    const [existing] = await db
      .select({ id: foodTriggerProperties.id })
      .from(foodTriggerProperties)
      .where(eq(foodTriggerProperties.foodId, foodId))
      .limit(1);

    if (existing) {
      await db
        .update(foodTriggerProperties)
        .set({ [property]: value })
        .where(eq(foodTriggerProperties.foodId, foodId));
    } else {
      await db.insert(foodTriggerProperties).values({
        foodId,
        [property]: value,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("PATCH /api/admin/foods error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
