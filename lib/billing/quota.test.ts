import { describe, it, expect } from "vitest";
import {
  evaluateAiQuota,
  spendUsd,
  startOfUtcDay,
  nextUtcMidnight,
  costOrWorstCase,
  withinBudget,
} from "./quota";
import { TIERS } from "./tiers";

const now = new Date(Date.UTC(2026, 9, 28, 17, 30)); // 17:30 UTC → resets in 6.5h

describe("UTC day boundaries", () => {
  it("starts the day at UTC midnight", () => {
    expect(startOfUtcDay(now).toISOString()).toBe("2026-10-28T00:00:00.000Z");
    expect(nextUtcMidnight(now).toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });
});

describe("spendUsd", () => {
  it("sums known models at list price", () => {
    const usd = spendUsd([
      { model: "claude-opus-5", inputTokens: 1_000_000, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
      { model: "claude-sonnet-5", inputTokens: 0, outputTokens: 100_000, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
    ]);
    expect(usd).toBeCloseTo(5 + 1, 6);
  });

  it("prices unknown models at the most expensive known rate instead of free", () => {
    const row = { inputTokens: 1_000_000, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
    expect(costOrWorstCase({ model: "mystery-model", ...row })).toBeCloseTo(5, 6);
  });

  it("is zero with no rows", () => {
    expect(spendUsd([])).toBe(0);
  });
});

describe("evaluateAiQuota", () => {
  const base = { isAdmin: false, chatMessagesToday: 0, spendTodayUsd: 0, now };

  it("allows a free user under both limits and reports the remaining budget", () => {
    const d = evaluateAiQuota({ ...base, tier: "free", kind: "chat", chatMessagesToday: 4, spendTodayUsd: 0.1 });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.remainingBudgetUsd).toBeCloseTo(TIERS.free.limits.dailyAiBudgetUsd - 0.1, 6);
  });

  it("blocks the free user's 6th chat message of the day with a friendly message", () => {
    const d = evaluateAiQuota({ ...base, tier: "free", kind: "chat", chatMessagesToday: 5 });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.code).toBe("daily_chat_limit");
      expect(d.message).toMatch(/5 coaching messages/);
      expect(d.message).toMatch(/about 7 hours/);
      expect(d.retryAfterSeconds).toBe(6.5 * 3600);
    }
  });

  it("does not apply the chat-message cap to capture", () => {
    const d = evaluateAiQuota({ ...base, tier: "free", kind: "capture", chatMessagesToday: 50 });
    expect(d.allowed).toBe(true);
  });

  it("blocks any AI call once today's spend reaches the tier budget", () => {
    for (const kind of ["chat", "capture"] as const) {
      const d = evaluateAiQuota({ ...base, tier: "free", kind, spendTodayUsd: TIERS.free.limits.dailyAiBudgetUsd });
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.code).toBe("daily_ai_budget");
    }
  });

  it("gives paid tiers unlimited messages but still a cost budget", () => {
    const ok = evaluateAiQuota({ ...base, tier: "basic", kind: "chat", chatMessagesToday: 500, spendTodayUsd: 1 });
    expect(ok.allowed).toBe(true);
    const over = evaluateAiQuota({ ...base, tier: "premium", kind: "chat", spendTodayUsd: TIERS.premium.limits.dailyAiBudgetUsd + 0.01 });
    expect(over.allowed).toBe(false);
  });

  it("exempts admins from tier limits", () => {
    const d = evaluateAiQuota({ ...base, isAdmin: true, tier: "free", kind: "chat", chatMessagesToday: 999, spendTodayUsd: 999 });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.remainingBudgetUsd).toBe(Infinity);
  });

  it("says 'under an hour' close to midnight", () => {
    const late = new Date(Date.UTC(2026, 9, 28, 23, 40));
    const d = evaluateAiQuota({ ...base, now: late, tier: "free", kind: "chat", chatMessagesToday: 5 });
    if (!d.allowed) expect(d.message).toMatch(/in under an hour/);
  });
});

describe("withinBudget", () => {
  const zero = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
  it("stops further rounds once this request's cost would exceed what is left", () => {
    expect(withinBudget("claude-opus-5", zero, 0.5)).toBe(true);
    expect(withinBudget("claude-opus-5", { ...zero, inputTokens: 200_000 }, 0.5)).toBe(false); // $1.00
    expect(withinBudget("claude-opus-5", { ...zero, inputTokens: 200_000 }, Infinity)).toBe(true);
  });
});
