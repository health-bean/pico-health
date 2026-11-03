import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { runInsightsEngine } from "@/lib/insights/engine";
import { cacheGet, cacheSet, insightsCacheKey } from "@/lib/cache/insights";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 90;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "days must be between 1 and 365" },
        { status: 400 }
      );
    }

    const cacheKey = insightsCacheKey(session.userId, "v2", days);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await runInsightsEngine(session.userId, days);
    await cacheSet(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error) {
    log.error("GET /api/insights failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
