import { NextResponse } from "next/server";
import { getUserSubscription } from "./subscription";
import { evaluateAiQuota, spendUsd, startOfUtcDay, type AiQuotaDecision, type AiQuotaKind } from "./quota";
import { chatMessagesSince, usageByModelSince } from "@/lib/db/queries/usage";

/**
 * Load today's (UTC) usage for a user and decide whether another AI request
 * is allowed. Admins skip the lookups entirely.
 */
export async function checkAiQuota(
  session: { userId: string; isAdmin: boolean },
  kind: AiQuotaKind,
  now: Date = new Date()
): Promise<AiQuotaDecision> {
  if (session.isAdmin) return { allowed: true, remainingBudgetUsd: Infinity };

  const since = startOfUtcDay(now);
  const [subscription, usageRows, chatMessagesToday] = await Promise.all([
    getUserSubscription(session.userId),
    usageByModelSince(session.userId, since),
    kind === "chat" ? chatMessagesSince(session.userId, since) : Promise.resolve(0),
  ]);

  return evaluateAiQuota({
    tier: subscription.tier,
    isAdmin: false,
    kind,
    chatMessagesToday,
    spendTodayUsd: spendUsd(usageRows),
    now,
  });
}

/** The 429 the chat/capture clients show verbatim (`error` is user-facing copy). */
export function quotaExceededResponse(decision: Extract<AiQuotaDecision, { allowed: false }>) {
  return NextResponse.json(
    { error: decision.message, code: decision.code },
    { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } }
  );
}
