import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles, usageLog } from "@/lib/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { estimateCostUsd } from "@/lib/billing/ai-pricing";
import { log } from "@/lib/logger";

// GET /api/admin/usage?days=7|30|90 (default 30)
//
// AI usage + estimated spend, aggregated from usage_log. Groups always
// include the model so cost math is exact per (group, model); TS rolls
// unknown-model groups up as "unknown" (cost null) rather than guessing.

const querySchema = z.object({
  days: z.enum(["7", "30", "90"]).default("30"),
});

interface TokenSums {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

function groupCost(model: string, sums: TokenSums): number | null {
  return estimateCostUsd({ model, ...sums });
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      days: searchParams.get("days") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "days must be 7, 30, or 90" },
        { status: 400 }
      );
    }
    const days = Number(parsed.data.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const requests = sql<number>`count(*)::int`;
    // float8: exact for realistic token sums (< 2^53), and the driver
    // returns it as a JS number (bigint/numeric would come back as strings).
    const tokenSums = {
      inputTokens: sql<number>`coalesce(sum(${usageLog.inputTokens}), 0)::float8`,
      outputTokens: sql<number>`coalesce(sum(${usageLog.outputTokens}), 0)::float8`,
      cacheReadInputTokens: sql<number>`coalesce(sum(${usageLog.cacheReadInputTokens}), 0)::float8`,
      cacheCreationInputTokens: sql<number>`coalesce(sum(${usageLog.cacheCreationInputTokens}), 0)::float8`,
    };
    const day = sql<string>`to_char(${usageLog.createdAt}, 'YYYY-MM-DD')`;

    const taskModelRows = await db
      .select({ task: usageLog.task, model: usageLog.model, requests, ...tokenSums })
      .from(usageLog)
      .where(gte(usageLog.createdAt, since))
      .groupBy(usageLog.task, usageLog.model);

    const userModelRows = await db
      .select({
        userId: usageLog.userId,
        email: profiles.email,
        model: usageLog.model,
        requests,
        ...tokenSums,
      })
      .from(usageLog)
      .leftJoin(profiles, eq(profiles.id, usageLog.userId))
      .where(gte(usageLog.createdAt, since))
      .groupBy(usageLog.userId, profiles.email, usageLog.model);

    const dayModelRows = await db
      .select({ date: day, model: usageLog.model, requests, ...tokenSums })
      .from(usageLog)
      .where(gte(usageLog.createdAt, since))
      .groupBy(day, usageLog.model);

    // Totals — derived from the (task, model) groups.
    const totals = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      estCostUsd: 0,
      unknownModelRequests: 0,
    };
    const byTask = taskModelRows.map((row) => {
      const estCostUsd = groupCost(row.model, row);
      totals.requests += row.requests;
      totals.inputTokens += row.inputTokens;
      totals.outputTokens += row.outputTokens;
      totals.cacheReadInputTokens += row.cacheReadInputTokens;
      totals.cacheCreationInputTokens += row.cacheCreationInputTokens;
      if (estCostUsd === null) {
        totals.unknownModelRequests += row.requests;
      } else {
        totals.estCostUsd += estCostUsd;
      }
      return {
        task: row.task,
        model: row.model,
        requests: row.requests,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        estCostUsd,
      };
    });
    byTask.sort((a, b) => (b.estCostUsd ?? -1) - (a.estCostUsd ?? -1));

    // Cost per user — roll (user, model) groups up per user, top 25 by cost.
    const userMap = new Map<
      string,
      { userId: string; email: string | null; requests: number; estCostUsd: number }
    >();
    for (const row of userModelRows) {
      const entry = userMap.get(row.userId) ?? {
        userId: row.userId,
        email: row.email,
        requests: 0,
        estCostUsd: 0,
      };
      entry.requests += row.requests;
      entry.estCostUsd += groupCost(row.model, row) ?? 0;
      userMap.set(row.userId, entry);
    }
    const byUser = [...userMap.values()]
      .sort((a, b) => b.estCostUsd - a.estCostUsd)
      .slice(0, 25);

    // Daily — roll (day, model) groups up per day, ascending by date.
    const dayMap = new Map<string, { date: string; requests: number; estCostUsd: number }>();
    for (const row of dayModelRows) {
      const entry = dayMap.get(row.date) ?? { date: row.date, requests: 0, estCostUsd: 0 };
      entry.requests += row.requests;
      entry.estCostUsd += groupCost(row.model, row) ?? 0;
      dayMap.set(row.date, entry);
    }
    const byDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ totals, byTask, byUser, byDay });
  } catch (error) {
    log.error("GET /api/admin/usage error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
