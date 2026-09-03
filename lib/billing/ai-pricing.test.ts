import { describe, it, expect } from "vitest";
import { MODEL_PRICING, estimateCostUsd } from "./ai-pricing";

const zero = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
};

describe("estimateCostUsd", () => {
  it("prices input and output tokens at the per-MTok rate", () => {
    const cost = estimateCostUsd({
      ...zero,
      model: "claude-sonnet-5",
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });
    // 1 MTok * $2 + 0.5 MTok * $10 = $7
    expect(cost).toBeCloseTo(7, 10);
  });

  it("bills cache reads at 10% of the input rate", () => {
    const cost = estimateCostUsd({
      ...zero,
      model: "claude-opus-5",
      cacheReadInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.5, 10); // $5 * 0.1
  });

  it("bills cache creation at 125% of the input rate", () => {
    const cost = estimateCostUsd({
      ...zero,
      model: "claude-haiku-4-5",
      cacheCreationInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.25, 10); // $1 * 1.25
  });

  it("combines all four components", () => {
    const cost = estimateCostUsd({
      model: "claude-sonnet-5",
      inputTokens: 100_000,
      outputTokens: 20_000,
      cacheReadInputTokens: 400_000,
      cacheCreationInputTokens: 50_000,
    });
    // 0.1*2 + 0.02*10 + 0.4*2*0.1 + 0.05*2*1.25 = 0.2 + 0.2 + 0.08 + 0.125
    expect(cost).toBeCloseTo(0.605, 10);
  });

  it("returns 0 for zero tokens on a known model", () => {
    expect(estimateCostUsd({ ...zero, model: "claude-opus-5" })).toBe(0);
  });

  it("returns null for an unknown model (never guess)", () => {
    expect(
      estimateCostUsd({ ...zero, model: "gpt-6-mini", inputTokens: 1000 })
    ).toBeNull();
  });

  it("has both rates for every model in the pricing map", () => {
    for (const [model, p] of Object.entries(MODEL_PRICING)) {
      expect(p.inputPerMTok, model).toBeGreaterThan(0);
      expect(p.outputPerMTok, model).toBeGreaterThan(0);
    }
  });
});
