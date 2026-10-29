/**
 * Subscription tier definitions and feature gating.
 *
 * Free:    Basic tracking, protocol food lists
 * Basic:   + AI insights, food search, protocol compliance ($1.99/mo)
 * Premium: + Advanced correlations, data export, practitioner sharing ($3.99/mo)
 */

/**
 * Daily AI cost ceilings (USD, estimated from usage_log via ai-pricing.ts).
 * Days are UTC days — the same for everyone and not resettable by changing
 * the profile timezone. These are abuse ceilings, not expected spend:
 * a capture costs ~$0.01–0.02 (Sonnet 5), a coaching message ~$0.03–0.25
 * (Opus 5, grows with history and tool rounds).
 */
export const FREE_DAILY_AI_BUDGET_USD = 0.5;
export const PAID_DAILY_AI_BUDGET_USD = 5;

export type SubscriptionTier = "free" | "basic" | "premium";

export interface TierConfig {
  name: string;
  monthlyPrice: number;
  features: string[];
  limits: {
    /** Coaching messages (POST /api/chat) per UTC day. Capture is not counted. */
    dailyChatMessages: number;
    /** Estimated AI spend per UTC day across chat + capture. */
    dailyAiBudgetUsd: number;
    maxProtocols: number;
    correlationInsights: boolean;
    dataExport: boolean;
    practitionerSharing: boolean;
  };
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    features: [
      "Basic food & symptom tracking",
      "Protocol food lists (allowed/avoid)",
      "Timeline view",
    ],
    limits: {
      dailyChatMessages: 5,
      dailyAiBudgetUsd: FREE_DAILY_AI_BUDGET_USD,
      maxProtocols: 1,
      correlationInsights: false,
      dataExport: false,
      practitionerSharing: false,
    },
  },
  basic: {
    name: "Basic",
    monthlyPrice: 1.99,
    features: [
      "Everything in Free",
      "Unlimited AI chat",
      "Protocol compliance checking",
      "USDA food database search",
      "Multiple protocols",
    ],
    limits: {
      dailyChatMessages: Infinity,
      dailyAiBudgetUsd: PAID_DAILY_AI_BUDGET_USD,
      maxProtocols: 3,
      correlationInsights: false,
      dataExport: false,
      practitionerSharing: false,
    },
  },
  premium: {
    name: "Premium",
    monthlyPrice: 3.99,
    features: [
      "Everything in Basic",
      "AI correlation insights",
      "Food-symptom pattern analysis",
      "CSV data export",
      "Practitioner sharing",
      "Unlimited protocols",
    ],
    limits: {
      dailyChatMessages: Infinity,
      dailyAiBudgetUsd: PAID_DAILY_AI_BUDGET_USD,
      maxProtocols: Infinity,
      correlationInsights: true,
      dataExport: true,
      practitionerSharing: true,
    },
  },
};
