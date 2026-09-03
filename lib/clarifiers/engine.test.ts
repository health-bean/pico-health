import { describe, it, expect } from "vitest";
import { selectClarifier, isFilled } from "./engine";
import type { SelectClarifierInput } from "./types";

function input(overrides: Partial<SelectClarifierInput> = {}): SelectClarifierInput {
  return {
    entry: {
      id: "e1",
      foodId: "f-salmon",
      foodName: "Salmon",
      foodCategory: "Fish & Seafood",
      structuredContent: null,
    },
    properties: { histamine: "high", fodmap: "low" },
    protocolAxes: null,
    history: [],
    userDefaults: {},
    answeredToday: 0,
    ...overrides,
  };
}

describe("selectClarifier — relevance", () => {
  it("asks about preparation for a high-histamine food with no protocol", () => {
    const c = selectClarifier(input());
    expect(c?.ruleId).toBe("histamine-preparation");
    expect(c?.question).toBe("Salmon — fresh or leftover?");
    expect(c?.why).toBe("matters for histamine");
  });

  it("asks nothing for a food with no relevant axes (white rice)", () => {
    const c = selectClarifier(
      input({
        entry: { id: "e2", foodId: "f-rice", foodName: "White Rice", foodCategory: "Grains & Starches", structuredContent: null },
        properties: { histamine: "low", fodmap: "low", oxalate: "low" },
      })
    );
    expect(c).toBeNull();
  });

  it("asks nothing without a foodId or without known properties", () => {
    expect(selectClarifier(input({ entry: { ...input().entry, foodId: null } }))).toBeNull();
    expect(selectClarifier(input({ properties: null }))).toBeNull();
  });

  it("respects the protocol: a low-FODMAP user is not asked histamine questions", () => {
    const c = selectClarifier(input({ protocolAxes: new Set(["fodmap"]) }));
    expect(c).toBeNull();
  });

  it("a low-FODMAP user IS asked about dose for a moderate-FODMAP food", () => {
    const c = selectClarifier(
      input({
        entry: { id: "e3", foodId: "f-avocado", foodName: "Avocado", foodCategory: "Fruits", structuredContent: null },
        properties: { fodmap: "moderate", histamine: "moderate" },
        protocolAxes: new Set(["fodmap"]),
      })
    );
    expect(c?.ruleId).toBe("dose-quantity");
    expect(c?.options.map((o) => o.value)).toEqual(["less", "usual", "more"]);
  });

  it("treats the nightshade boolean as 'high'", () => {
    const c = selectClarifier(
      input({
        entry: { id: "e4", foodId: "f-curry", foodName: "Chicken Curry", foodCategory: "Prepared Dishes", structuredContent: null },
        properties: { nightshade: true },
        protocolAxes: new Set(["nightshade"]),
      })
    );
    expect(c?.ruleId).toBe("nightshade-seasoning");
    expect(c?.multi).toBe(true);
  });

  it("does not ask about seasoning for a non-savory category (banana)", () => {
    const c = selectClarifier(
      input({
        entry: { id: "e5", foodId: "f-banana", foodName: "Banana", foodCategory: "Fruits", structuredContent: null },
        properties: { salicylate: "high" },
        protocolAxes: new Set(["salicylate"]),
      })
    );
    expect(c).toBeNull();
  });
});

describe("selectClarifier — one question, fixed priority", () => {
  it("prefers preparation over quantity over additions when several apply", () => {
    const c = selectClarifier(
      input({
        properties: { histamine: "high", fodmap: "high", nightshade: true },
      })
    );
    expect(c?.dimension).toBe("preparation");
  });

  it("falls through to the next dimension when the first is already filled", () => {
    const c = selectClarifier(
      input({
        entry: { ...input().entry, structuredContent: { preparation: ["leftover"] } },
        properties: { histamine: "high", fodmap: "high" },
      })
    );
    expect(c?.dimension).toBe("quantity");
  });

  it("is deterministic: identical inputs give identical output", () => {
    const a = selectClarifier(input({ properties: { histamine: "high", fodmap: "high", nightshade: true } }));
    const b = selectClarifier(input({ properties: { histamine: "high", fodmap: "high", nightshade: true } }));
    expect(a).toEqual(b);
  });
});

describe("selectClarifier — memory and limits", () => {
  it("never re-asks a dimension already answered for this food (moves on to the next)", () => {
    const c = selectClarifier(
      input({ history: [{ dimension: "preparation", answer: "fresh", answerCount: 1, skipCount: 0 }] })
    );
    expect(c?.dimension).toBe("quantity"); // histamine high → dose is still open
    const done = selectClarifier(
      input({
        history: [
          { dimension: "preparation", answer: "fresh", answerCount: 1, skipCount: 0 },
          { dimension: "quantity", answer: "usual", answerCount: 1, skipCount: 0 },
        ],
      })
    );
    expect(done).toBeNull();
  });

  it("asks again after one skip but not after two", () => {
    const once = selectClarifier(
      input({ history: [{ dimension: "preparation", answer: null, answerCount: 0, skipCount: 1 }] })
    );
    expect(once?.dimension).toBe("preparation");
    const twice = selectClarifier(
      input({ history: [{ dimension: "preparation", answer: null, answerCount: 0, skipCount: 2 }] })
    );
    expect(twice?.dimension).toBe("quantity");
  });

  it("stops at the daily cap", () => {
    expect(selectClarifier(input({ answeredToday: 2 }))).not.toBeNull();
    expect(selectClarifier(input({ answeredToday: 3 }))).toBeNull();
  });

  it("pre-selects the user's usual answer when it is one of the options", () => {
    const c = selectClarifier(input({ userDefaults: { preparation: "fresh" } }));
    expect(c?.suggested).toBe("fresh");
    const bogus = selectClarifier(input({ userDefaults: { preparation: "microwaved" } }));
    expect(bogus?.suggested).toBeNull();
  });
});

describe("isFilled", () => {
  it("treats empty arrays and missing keys as unfilled", () => {
    expect(isFilled(null, "preparation")).toBe(false);
    expect(isFilled({ preparation: [] }, "preparation")).toBe(false);
    expect(isFilled({ preparation: ["fresh"] }, "preparation")).toBe(true);
    expect(isFilled({ quantity: "more" }, "quantity")).toBe(true);
    expect(isFilled({ quantity: "" }, "quantity")).toBe(false);
  });
});
