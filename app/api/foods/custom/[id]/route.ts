import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customFoods,
  customFoodProperties,
  timelineEntries,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import { isUuid, parseBody } from "@/lib/api/validation";
import { updateCustomFoodSchema } from "../schema";

// ── PATCH /api/foods/custom/[id] ────────────────────────────────────────
// Update a custom food

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    // Verify food exists and belongs to user
    const [existingFood] = await db
      .select()
      .from(customFoods)
      .where(and(eq(customFoods.id, id), eq(customFoods.userId, session.userId)))
      .limit(1);

    if (!existingFood) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const parsed = await parseBody(request, updateCustomFoodSchema);
    if (parsed.response) return parsed.response;
    const { displayName, category, subcategory, properties } = parsed.data;

    // Update custom food
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (category !== undefined) {
      updateData.category = category || null;
    }
    if (subcategory !== undefined) {
      updateData.subcategory = subcategory || null;
    }

    await db
      .update(customFoods)
      .set(updateData)
      .where(eq(customFoods.id, id));

    // Update properties if provided
    if (properties) {
      // Check if properties record exists
      const [existingProps] = await db
        .select()
        .from(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, id))
        .limit(1);

      const propsData = {
        oxalate: properties.oxalate || "unknown",
        histamine: properties.histamine || "unknown",
        lectin: properties.lectin || "unknown",
        nightshade: properties.nightshade ?? false,
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
      };

      if (existingProps) {
        await db
          .update(customFoodProperties)
          .set(propsData)
          .where(eq(customFoodProperties.customFoodId, id));
      } else {
        await db.insert(customFoodProperties).values({
          customFoodId: id,
          ...propsData,
        });
      }
    }

    // Fetch updated food with properties
    const [updatedFood] = await db
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
      .where(eq(customFoods.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      food: updatedFood,
    });
  } catch (error) {
    log.error("PATCH /api/foods/custom/[id] error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/foods/custom/[id] ───────────────────────────────────────
// Delete or archive a custom food

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    // Verify food exists and belongs to user
    const [existingFood] = await db
      .select()
      .from(customFoods)
      .where(and(eq(customFoods.id, id), eq(customFoods.userId, session.userId)))
      .limit(1);

    if (!existingFood) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    // Check if food is used in any timeline entries
    const usedInEntries = await db
      .select({ id: timelineEntries.id })
      .from(timelineEntries)
      .where(
        and(
          eq(timelineEntries.userId, session.userId),
          eq(timelineEntries.name, existingFood.displayName)
        )
      )
      .limit(1);

    if (usedInEntries.length > 0) {
      // Archive instead of delete
      await db
        .update(customFoods)
        .set({
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(eq(customFoods.id, id));

      return NextResponse.json({
        success: true,
        archived: true,
        message: "Food is used in timeline entries and has been archived",
      });
    }

    // Safe to delete
    await db.delete(customFoods).where(eq(customFoods.id, id));

    return NextResponse.json({
      success: true,
      archived: false,
      message: "Food deleted successfully",
    });
  } catch (error) {
    log.error("DELETE /api/foods/custom/[id] error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
