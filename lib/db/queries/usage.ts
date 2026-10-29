import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, usageLog } from "@/lib/db/schema";

/** Token sums per model for one user since `since` (for daily spend). */
export function usageByModelSince(userId: string, since: Date) {
  return db
    .select({
      model: usageLog.model,
      inputTokens: sql<number>`coalesce(sum(${usageLog.inputTokens}), 0)::float8`,
      outputTokens: sql<number>`coalesce(sum(${usageLog.outputTokens}), 0)::float8`,
      cacheReadInputTokens: sql<number>`coalesce(sum(${usageLog.cacheReadInputTokens}), 0)::float8`,
      cacheCreationInputTokens: sql<number>`coalesce(sum(${usageLog.cacheCreationInputTokens}), 0)::float8`,
    })
    .from(usageLog)
    .where(and(eq(usageLog.userId, userId), gte(usageLog.createdAt, since)))
    .groupBy(usageLog.model);
}

/**
 * User-sent chat messages since `since`. messages.created_at is a plain
 * timestamp written by the DB clock (UTC on Supabase), so compare as UTC.
 */
export async function chatMessagesSince(userId: string, since: Date): Promise<number> {
  const sinceUtc = since.toISOString().replace("T", " ").replace("Z", "");
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(messages.role, "user"),
        gte(messages.createdAt, sql`${sinceUtc}::timestamp`)
      )
    );
  return row?.n ?? 0;
}
