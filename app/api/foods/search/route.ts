import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProtocolState } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { searchFoods } from "@/lib/db/queries/foods";
import { loadProtocolContext, checkComplianceSync } from "@/lib/protocols/compliance";
import { log } from "@/lib/logger";
import { loadPersonalRatings } from "@/lib/personal/ratings";
import { personalStatus } from "@/lib/protocols/fit-line";

// Note: Using Node.js runtime (not edge) due to postgres package requirements
// Edge runtime doesn't support Node.js APIs (stream, perf_hooks) needed by postgres

// ── GET /api/foods/search?query=tomato&limit=10&protocolId=uuid ────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const limitParam = searchParams.get("limit");
    const protocolId = searchParams.get("protocolId");

    // Validate query parameter (minimum 2 characters)
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Get user session for custom foods
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse limit parameter (default 10, max 10 as per requirements)
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 10;

    // Call searchFoods function
    const results = await searchFoods(query.trim(), session.userId, limit);

    // If a protocol is specified, determine compliance status for each food
    if (protocolId) {
      // Determine current phase for phase-aware compliance
      let phaseId: string | null = null;
      try {
        const [state] = await db
          .select({ currentPhaseId: userProtocolState.currentPhaseId })
          .from(userProtocolState)
          .where(
            and(
              eq(userProtocolState.userId, session.userId),
              eq(userProtocolState.protocolId, protocolId)
            )
          )
          .limit(1);
        phaseId = state?.currentPhaseId ?? null;
      } catch {
        // Skip phase awareness if error
        phaseId = null;
      }

      // Load protocol context once, then check all foods in-memory
      const foodIds = results.map((f) => f.id).filter(Boolean);
      const [protocolCtx, personal] = await Promise.all([
        loadProtocolContext(protocolId, phaseId, foodIds),
        loadPersonalRatings(session.userId, foodIds),
      ]);

      const resultsWithStatus = results.map((food) => {
        // Skip compliance check for foods without trigger data (e.g. USDA-sourced)
        let protocolStatus = null;
        let protocolViolations: string[] = [];
        if (food.hasTriggerData) {
          const complianceResult = checkComplianceSync(
            protocolCtx,
            food.properties,
            food.id,
            food.category
          );
          protocolStatus = complianceResult.status;
          protocolViolations = complianceResult.violations;
        }
        // The person's own rating wins: a food they passed isn't flagged.
        const mine = personal.get(food.id);
        if (mine) {
          protocolStatus = personalStatus(protocolStatus ?? "allowed", mine);
          protocolViolations = mine.status === "safe" ? [] : [mine.status === "sensitive" ? "You marked: small amounts" : "You marked: not for you"];
        }

        return {
          ...food,
          protocolStatus,
          protocolViolations,
          categoryName: food.category,
          subcategoryName: food.subcategory,
          triggerProperties: food.properties,
        };
      });

      return NextResponse.json({ foods: resultsWithStatus });
    }

    // No protocol — return results without compliance status
    const resultsWithStatus = results.map((food) => ({
      ...food,
      protocolStatus: null,
      categoryName: food.category,
      subcategoryName: food.subcategory,
      triggerProperties: food.properties,
    }));

    return NextResponse.json({ foods: resultsWithStatus });
  } catch (error) {
    log.error("GET /api/foods/search error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
