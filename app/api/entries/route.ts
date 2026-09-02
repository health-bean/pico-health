import { NextResponse } from "next/server";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { 
  timelineEntries, 
  foods, 
  foodSubcategories, 
  foodCategories,
  foodTriggerProperties,
  customFoods,
  customFoodProperties,
  profiles,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { loadProtocolContext, checkComplianceSync } from "@/lib/protocols/compliance";
import { trackReintroductionEntry } from "@/lib/reintroductions/tracking";
import { insightsCache } from "@/lib/cache/insights";

// ── GET /api/entries ────────────────────────────────────────────────────
// Query params: ?date=YYYY-MM-DD  ?type=food|symptom|...  ?days=7

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const type = searchParams.get("type");
    const days = searchParams.get("days");

    // Get user's current protocol for compliance checking
    const [user] = await db
      .select({ currentProtocolId: profiles.currentProtocolId })
      .from(profiles)
      .where(eq(profiles.id, session.userId))
      .limit(1);

    const currentProtocolId = user?.currentProtocolId;

    // Build conditions
    const conditions = [eq(timelineEntries.userId, session.userId)];

    if (date) {
      // Single date filter
      conditions.push(eq(timelineEntries.entryDate, date));
    } else if (days) {
      const daysNum = parseInt(days, 10);
      if (!isNaN(daysNum) && daysNum > 0) {
        conditions.push(
          gte(
            timelineEntries.entryDate,
            sql`CURRENT_DATE - ${daysNum}::int`
          )
        );
      }
    }

    if (type) {
      conditions.push(eq(timelineEntries.entryType, type));
    }

    // Fetch entries with food details joined
    const entries = await db
      .select({
        id: timelineEntries.id,
        entryType: timelineEntries.entryType,
        name: timelineEntries.name,
        severity: timelineEntries.severity,
        structuredContent: timelineEntries.structuredContent,
        entryDate: timelineEntries.entryDate,
        entryTime: timelineEntries.entryTime,
        exerciseType: timelineEntries.exerciseType,
        durationMinutes: timelineEntries.durationMinutes,
        intensityLevel: timelineEntries.intensityLevel,
        energyLevel: timelineEntries.energyLevel,
        foodId: timelineEntries.foodId,
        portion: timelineEntries.portion,
        mealType: timelineEntries.mealType,
        createdAt: timelineEntries.createdAt,
        // Food details from standard foods table
        foodDisplayName: foods.displayName,
        foodCategory: foodCategories.name,
        foodSubcategory: foodSubcategories.name,
        // Food trigger properties
        foodProperties: sql<Record<string, unknown> | null>`
          CASE 
            WHEN ${timelineEntries.foodId} IS NOT NULL THEN
              jsonb_build_object(
                'oxalate', ${foodTriggerProperties.oxalate},
                'histamine', ${foodTriggerProperties.histamine},
                'lectin', ${foodTriggerProperties.lectin},
                'nightshade', ${foodTriggerProperties.nightshade},
                'fodmap', ${foodTriggerProperties.fodmap},
                'salicylate', ${foodTriggerProperties.salicylate},
                'amines', ${foodTriggerProperties.amines},
                'glutamates', ${foodTriggerProperties.glutamates},
                'sulfites', ${foodTriggerProperties.sulfites},
                'goitrogens', ${foodTriggerProperties.goitrogens},
                'purines', ${foodTriggerProperties.purines},
                'phytoestrogens', ${foodTriggerProperties.phytoestrogens},
                'phytates', ${foodTriggerProperties.phytates},
                'tyramine', ${foodTriggerProperties.tyramine}
              )
            ELSE NULL
          END
        `,
        // Custom food details
        customFoodDisplayName: customFoods.displayName,
        customFoodCategory: customFoods.category,
        customFoodSubcategory: customFoods.subcategory,
        // Custom food properties
        customFoodProperties: sql<Record<string, unknown> | null>`
          CASE 
            WHEN ${customFoods.id} IS NOT NULL THEN
              jsonb_build_object(
                'oxalate', ${customFoodProperties.oxalate},
                'histamine', ${customFoodProperties.histamine},
                'lectin', ${customFoodProperties.lectin},
                'nightshade', ${customFoodProperties.nightshade},
                'fodmap', ${customFoodProperties.fodmap},
                'salicylate', ${customFoodProperties.salicylate},
                'amines', ${customFoodProperties.amines},
                'glutamates', ${customFoodProperties.glutamates},
                'sulfites', ${customFoodProperties.sulfites},
                'goitrogens', ${customFoodProperties.goitrogens},
                'purines', ${customFoodProperties.purines},
                'phytoestrogens', ${customFoodProperties.phytoestrogens},
                'phytates', ${customFoodProperties.phytates},
                'tyramine', ${customFoodProperties.tyramine}
              )
            ELSE NULL
          END
        `,
      })
      .from(timelineEntries)
      .leftJoin(foods, eq(timelineEntries.foodId, foods.id))
      .leftJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
      .leftJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
      .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
      .leftJoin(customFoods, eq(timelineEntries.foodId, customFoods.id))
      .leftJoin(customFoodProperties, eq(customFoodProperties.customFoodId, customFoods.id))
      .where(and(...conditions))
      .orderBy(desc(timelineEntries.entryDate), desc(timelineEntries.entryTime))
      .limit(200);

    // Pre-load protocol context once for batch compliance checking (0 or 1 query instead of N)
    const foodEntryIds = entries
      .filter((e) => e.foodId)
      .map((e) => e.foodId!);

    const protocolCtx =
      currentProtocolId && foodEntryIds.length > 0
        ? await loadProtocolContext(currentProtocolId, null, foodEntryIds)
        : null;

    // Transform entries — compliance is now pure in-memory, no DB calls
    const transformedEntries = entries.map((entry) => {
      const baseEntry = {
        id: entry.id,
        entryType: entry.entryType,
        name: entry.name,
        severity: entry.severity,
        structuredContent: entry.structuredContent,
        entryDate: entry.entryDate,
        entryTime: entry.entryTime,
        exerciseType: entry.exerciseType,
        durationMinutes: entry.durationMinutes,
        intensityLevel: entry.intensityLevel,
        energyLevel: entry.energyLevel,
        foodId: entry.foodId,
        portion: entry.portion,
        mealType: entry.mealType,
        createdAt: entry.createdAt,
      };

      if (entry.foodId) {
        const isCustomFood = entry.customFoodDisplayName != null;
        const properties = isCustomFood ? entry.customFoodProperties : entry.foodProperties;
        const category = isCustomFood ? entry.customFoodCategory : entry.foodCategory;

        let protocolViolations: string[] = [];
        if (protocolCtx && properties) {
          try {
            const compliance = checkComplianceSync(
              protocolCtx,
              properties as Record<string, string | boolean | null | undefined>,
              entry.foodId,
              category
            );
            if (compliance.status === "avoid" || compliance.status === "moderation") {
              protocolViolations = compliance.violations;
            }
          } catch (error) {
            log.warn("Error checking compliance", { error: error as Error });
          }
        }

        return {
          ...baseEntry,
          food: {
            displayName: isCustomFood ? entry.customFoodDisplayName : entry.foodDisplayName,
            category: category,
            subcategory: isCustomFood ? entry.customFoodSubcategory : entry.foodSubcategory,
            properties: properties,
            isCustom: isCustomFood,
          },
          protocolViolations,
        };
      }

      return baseEntry;
    });

    return NextResponse.json({ entries: transformedEntries });
  } catch (error) {
    log.error("GET /api/entries failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/entries ───────────────────────────────────────────────────

const createEntrySchema = z.object({
  entryType: z.enum([
    "food",
    "symptom",
    "supplement",
    "medication",
    "exposure",
    "detox",
    "exercise",
    "energy",
    "off_protocol",
  ]),
  name: z.string().min(1).max(255),
  severity: z.number().int().min(1).max(10).optional(),
  structuredContent: z.record(z.unknown()).optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  // Exercise-specific fields
  exerciseType: z.enum([
    "walking",
    "running",
    "cycling",
    "swimming",
    "yoga",
    "strength_training",
    "stretching",
    "sports",
    "other",
  ]).optional(),
  durationMinutes: z.number().int().positive().optional(),
  intensityLevel: z.enum(["light", "moderate", "vigorous"]).optional(),
  energyLevel: z.number().int().min(1).max(10).optional(),
  // Food-specific fields
  foodId: z.string().uuid().optional(),
  portion: z.string().max(100).optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  timezone: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { 
      entryType, 
      name, 
      severity, 
      structuredContent, 
      entryDate, 
      entryTime,
      exerciseType,
      durationMinutes,
      intensityLevel,
      energyLevel,
      foodId,
      portion,
      mealType,
      timezone: clientTimezone,
    } = parsed.data;

    // Validate exercise-specific fields when entryType is "exercise"
    if (entryType === "exercise") {
      if (!exerciseType) {
        return NextResponse.json(
          { error: "exercise_type is required for exercise entries" },
          { status: 400 }
        );
      }
      if (!durationMinutes) {
        return NextResponse.json(
          { error: "duration_minutes is required for exercise entries" },
          { status: 400 }
        );
      }
      if (!intensityLevel) {
        return NextResponse.json(
          { error: "intensity_level is required for exercise entries" },
          { status: 400 }
        );
      }
    }

    // Validate that exercise fields are only provided for exercise entries
    if (entryType !== "exercise" && (exerciseType || durationMinutes || intensityLevel)) {
      return NextResponse.json(
        { error: "Exercise fields can only be provided for exercise entries" },
        { status: 400 }
      );
    }

    // Default portion to "1 serving" if not provided for food entries
    let finalPortion = portion;
    if (entryType === "food" && !portion) {
      finalPortion = "1 serving";
    }

    // Validate food fields: off_protocol can use mealType but not foodId/portion
    if (entryType === "off_protocol" && (foodId || portion)) {
      return NextResponse.json(
        { error: "Off-protocol entries should not reference a specific food" },
        { status: 400 }
      );
    }
    if (entryType !== "food" && entryType !== "off_protocol" && (foodId || portion || mealType)) {
      return NextResponse.json(
        { error: "Food fields can only be provided for food entries" },
        { status: 400 }
      );
    }

    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: session.userId,
        entryType,
        name,
        severity: severity ?? null,
        structuredContent: structuredContent ?? null,
        entryDate,
        entryTime: entryTime ?? null,
        exerciseType: exerciseType ?? null,
        durationMinutes: durationMinutes ?? null,
        intensityLevel: intensityLevel ?? null,
        energyLevel: energyLevel ?? null,
        foodId: foodId ?? null,
        portion: finalPortion ?? null,
        mealType: mealType ?? null,
        timezone: clientTimezone ?? session.timezone ?? null,
      })
      .returning();

    // Track reintroduction if this is a food entry with an active reintroduction
    let reintroductionTracking;
    if (entryType === "food" && foodId) {
      reintroductionTracking = await trackReintroductionEntry(
        session.userId,
        foodId,
        entry.id,
        entryDate
      );
    }

    // Invalidate insights cache for this user
    insightsCache.invalidatePattern(`^${session.userId}:insights:`);

    return NextResponse.json({ 
      entry,
      reintroductionTracking,
    }, { status: 201 });
  } catch (error) {
    log.error("POST /api/entries failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
