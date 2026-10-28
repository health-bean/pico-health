import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customFoods, customFoodProperties } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import { parseBody } from "@/lib/api/validation";
import { createCustomFoodSchema } from "./schema";

// ── POST /api/foods/custom ──────────────────────────────────────────────
// Create a new custom food

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const parsed = await parseBody(request, createCustomFoodSchema);
    if (parsed.response) return parsed.response;
    const { displayName, category, subcategory, properties } = parsed.data;

    // Create custom food
    const [newFood] = await db
      .insert(customFoods)
      .values({
        userId: session.userId,
        displayName,
        category: category || null,
        subcategory: subcategory || null,
        isArchived: false,
      })
      .returning();

    // Create properties if provided
    if (properties) {
      await db.insert(customFoodProperties).values({
        customFoodId: newFood.id,
        oxalate: properties.oxalate || "unknown",
        histamine: properties.histamine || "unknown",
        lectin: properties.lectin || "unknown",
        nightshade: properties.nightshade || false,
        fodmap: properties.fodmap || "unknown",
        salicylate: properties.salicylate || "unknown",
        amines: properties.amines || "unknown",
        glutamates: properties.glutamates || "unknown",
        sulfites: properties.sulfites || "unknown",
        goitrogens: properties.goitrogens || "unknown",
        purines: properties.purines || "unknown",
        phytoestrogens: properties.phytoestrogens || "unknown",
        phytates: properties.phytates || "unknown",
        tyramine: properties.tyramine || "unknown",
      });
    }

    // Fetch the complete food with properties
    const [foodWithProperties] = await db
      .select({
        id: customFoods.id,
        userId: customFoods.userId,
        displayName: customFoods.displayName,
        category: customFoods.category,
        subcategory: customFoods.subcategory,
        isArchived: customFoods.isArchived,
        createdAt: customFoods.createdAt,
        updatedAt: customFoods.updatedAt,
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
      .where(eq(customFoods.id, newFood.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      food: foodWithProperties,
    });
  } catch (error) {
    log.error("POST /api/foods/custom error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
