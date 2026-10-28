import { NextResponse } from "next/server";
import { eq, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { 
  reintroductionLog,
  foods,
  customFoods,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import { readJson, uuidString } from "@/lib/api/validation";

// ── POST /api/reintroductions ───────────────────────────────────────────
// Start a new reintroduction

const startReintroductionSchema = z.object({
  foodId: uuidString().optional(),
  foodName: z.string().min(1).max(255),
  protocolId: uuidString(),
});

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await readJson(request);
    const parsed = startReintroductionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { foodId, foodName, protocolId } = parsed.data;

    // Validate no active reintroduction exists for user
    const activeReintroduction = await db
      .select()
      .from(reintroductionLog)
      .where(
        and(
          eq(reintroductionLog.userId, session.userId),
          eq(reintroductionLog.status, "active")
        )
      )
      .limit(1);

    if (activeReintroduction.length > 0) {
      return NextResponse.json(
        { 
          error: "Active reintroduction already exists",
          message: `You already have an active reintroduction for ${activeReintroduction[0].foodName}. Please complete or stop it before starting a new one.`
        },
        { status: 400 }
      );
    }

    // Resolve foodId if only foodName provided
    let resolvedFoodId = foodId;
    let resolvedFoodName = foodName;

    if (!foodId) {
      // Try to find food in standard foods table
      const standardFood = await db
        .select({ id: foods.id, displayName: foods.displayName })
        .from(foods)
        .where(sql`LOWER(${foods.displayName}) = LOWER(${foodName})`)
        .limit(1);

      if (standardFood.length > 0) {
        resolvedFoodId = standardFood[0].id;
        resolvedFoodName = standardFood[0].displayName;
      } else {
        // Try to find in custom foods
        const customFood = await db
          .select({ id: customFoods.id, displayName: customFoods.displayName })
          .from(customFoods)
          .where(
            and(
              eq(customFoods.userId, session.userId),
              sql`LOWER(${customFoods.displayName}) = LOWER(${foodName})`
            )
          )
          .limit(1);

        if (customFood.length > 0) {
          resolvedFoodId = customFood[0].id;
          resolvedFoodName = customFood[0].displayName;
        }
      }
    }

    // Validate no recent reintroduction for same food (14 days)
    if (resolvedFoodId) {
      const recentReintroduction = await db
        .select()
        .from(reintroductionLog)
        .where(
          and(
            eq(reintroductionLog.userId, session.userId),
            eq(reintroductionLog.foodId, resolvedFoodId),
            gte(reintroductionLog.startDate, sql`CURRENT_DATE - INTERVAL '14 days'`)
          )
        )
        .limit(1);

      if (recentReintroduction.length > 0) {
        return NextResponse.json(
          { 
            error: "Recent reintroduction exists",
            message: `You recently tested ${resolvedFoodName}. Please wait at least 14 days between reintroductions of the same food.`
          },
          { status: 400 }
        );
      }
    }

    // Create reintroduction_log record
    const [reintroduction] = await db
      .insert(reintroductionLog)
      .values({
        userId: session.userId,
        protocolId,
        foodId: resolvedFoodId ?? null,
        foodName: resolvedFoodName,
        startDate: sql`CURRENT_DATE`,
        status: "active",
        currentPhase: "testing",
        currentDay: 1,
      })
      .returning();

    // Return reintroduction record and instructions
    const instructions = `
# Reintroduction Protocol: ${resolvedFoodName}

## Testing Phase (Days 1-3)
- Eat ${resolvedFoodName} once daily for 3 consecutive days
- Log each time you eat this food
- Monitor for any symptoms

## Observation Phase (Days 4-7)
- Avoid ${resolvedFoodName} completely
- Continue monitoring symptoms
- Log any symptoms you experience

## Important Notes
- If you experience severe symptoms, stop immediately and mark the reintroduction as failed
- The system will automatically analyze results on day 7
- You can only have one active reintroduction at a time
    `.trim();

    return NextResponse.json(
      { 
        success: true,
        reintroduction,
        instructions,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("POST /api/reintroductions error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── GET /api/reintroductions ────────────────────────────────────────────
// List user's reintroductions

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Build conditions
    const conditions = [eq(reintroductionLog.userId, session.userId)];

    if (status) {
      conditions.push(eq(reintroductionLog.status, status));
    }

    // Fetch reintroductions
    const reintroductions = await db
      .select()
      .from(reintroductionLog)
      .where(and(...conditions))
      .orderBy(sql`${reintroductionLog.startDate} DESC`)
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset);

    const hasMore = reintroductions.length > limit;
    const results = hasMore ? reintroductions.slice(0, limit) : reintroductions;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reintroductionLog)
      .where(and(...conditions));

    return NextResponse.json({
      reintroductions: results,
      total: countResult.count,
      hasMore,
    });
  } catch (error) {
    log.error("GET /api/reintroductions error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
