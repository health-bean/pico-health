/**
 * Per-user daily AI limits — pure decision logic (no DB).
 *
 * Two limits, both per UTC day:
 *  - dailyChatMessages: coaching messages on POST /api/chat (free tier: 5)
 *  - dailyAiBudgetUsd:  estimated spend across chat + capture, from usage_log
 *
 * UTC, not the profile timezone: it is the same boundary usage_log is
 * reported on, and a user cannot reset their allowance by switching zones.
 * Admins are exempt (they still hit the per-minute rate limit).
 */

import { MODEL_PRICING, estimateCostUsd } from "./ai-pricing";
import { TIERS, type SubscriptionTier } from "./tiers";

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export type AiQuotaKind = "chat" | "capture";

export type AiQuotaDecision =
  | { allowed: true; remainingBudgetUsd: number }
  | {
      allowed: false;
      code: "daily_chat_limit" | "daily_ai_budget";
      message: string;
      retryAfterSeconds: number;
    };

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(startOfUtcDay(now).getTime() + DAY_MS);
}

const WORST_CASE_PRICING = Object.values(MODEL_PRICING).reduce((max, p) =>
  p.inputPerMTok + p.outputPerMTok > max.inputPerMTok + max.outputPerMTok ? p : max
);
const WORST_CASE_MODEL =
  Object.keys(MODEL_PRICING).find((k) => MODEL_PRICING[k] === WORST_CASE_PRICING) ?? "";

/**
 * Cost of a usage row; a model missing from the pricing table (e.g. an env
 * override) is priced at the most expensive known model, never as free.
 */
export function costOrWorstCase(row: TokenTotals & { model: string }): number {
  return estimateCostUsd(row) ?? estimateCostUsd({ ...row, model: WORST_CASE_MODEL }) ?? 0;
}

export function spendUsd(rows: Array<TokenTotals & { model: string }>): number {
  return rows.reduce((sum, row) => sum + costOrWorstCase(row), 0);
}

/** Whether a request that has used `usage` so far is still inside `remainingUsd`. */
export function withinBudget(model: string, usage: TokenTotals, remainingUsd: number): boolean {
  if (remainingUsd === Infinity) return true;
  return costOrWorstCase({ model, ...usage }) < remainingUsd;
}

function resetsIn(seconds: number): string {
  if (seconds < 3600) return "in under an hour";
  const hours = Math.ceil(seconds / 3600);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function evaluateAiQuota(params: {
  tier: SubscriptionTier;
  isAdmin: boolean;
  kind: AiQuotaKind;
  chatMessagesToday: number;
  spendTodayUsd: number;
  now: Date;
}): AiQuotaDecision {
  if (params.isAdmin) return { allowed: true, remainingBudgetUsd: Infinity };

  const limits = (TIERS[params.tier] ?? TIERS.free).limits;
  const retryAfterSeconds = Math.ceil((nextUtcMidnight(params.now).getTime() - params.now.getTime()) / 1000);
  const when = resetsIn(retryAfterSeconds);

  if (params.kind === "chat" && params.chatMessagesToday >= limits.dailyChatMessages) {
    return {
      allowed: false,
      code: "daily_chat_limit",
      message: `You've used today's ${limits.dailyChatMessages} coaching messages on the free plan. They reset ${when}. Logging from the Log tab still works.`,
      retryAfterSeconds,
    };
  }

  const remainingBudgetUsd = limits.dailyAiBudgetUsd - params.spendTodayUsd;
  if (remainingBudgetUsd <= 0) {
    return {
      allowed: false,
      code: "daily_ai_budget",
      message:
        params.kind === "capture"
          ? `You've reached today's limit for AI logging. It resets ${when}.`
          : `You've reached today's limit for coaching. It resets ${when}.`,
      retryAfterSeconds,
    };
  }

  return { allowed: true, remainingBudgetUsd };
}
