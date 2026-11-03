import { describe, it, expect } from "vitest";
import { computeRating, type MeasurementInput } from "./compute";

let n = 0;
function m(over: Partial<MeasurementInput>): MeasurementInput {
  n += 1;
  return {
    id: `m${n}`,
    valuePer100g: null,
    reportedLevel: null,
    studyYear: null,
    excluded: false,
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    ...over,
  };
}

describe("computeRating — amounts (oxalate, per serving)", () => {
  it("uses the middle value and ranks per serving (almonds, Norton test case)", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 28,
      measurements: [470, 410, 410, 130].map((v) => m({ valuePer100g: v })),
    });
    expect(r.median).toBe(410);
    expect(r.perServing).toBeCloseTo(114.8);
    expect(r.band).toBe("VH+");
    expect(r.level).toBe("very_high");
    expect(r.range).toEqual([130, 470]);
    expect(r.counted).toBe(4);
    // 130 mg/100g is "Very High" per serving, the rest "Extreme"
    expect(r.flags).toContain("studies_disagree");
    expect(r.needsReview).toBe(true);
  });

  it("matches Norton's bands at the edges", () => {
    const at = (perServing: number) =>
      computeRating({ property: "oxalate", servingGrams: 100, measurements: [m({ valuePer100g: perServing })] }).band;
    expect([at(1), at(4), at(10), at(21), at(45), at(75)]).toEqual(["VL", "L", "M", "H", "VH", "VH+"]);
  });

  it("maps bands onto the app's levels", () => {
    const level = (v: number) =>
      computeRating({ property: "oxalate", servingGrams: 100, measurements: [m({ valuePer100g: v })] }).level;
    expect([level(0), level(3), level(8), level(15), level(30), level(200)]).toEqual([
      "low", "low", "moderate", "high", "very_high", "very_high",
    ]);
  });

  it("flags a single test", () => {
    const r = computeRating({ property: "oxalate", servingGrams: 50, measurements: [m({ valuePer100g: 10 })] });
    expect(r.flags).toEqual(["one_test"]);
    expect(r.needsReview).toBe(false);
  });

  it("can't rank without a serving size", () => {
    const r = computeRating({ property: "oxalate", servingGrams: null, measurements: [m({ valuePer100g: 10 })] });
    expect(r.level).toBeNull();
    expect(r.median).toBe(10);
    expect(r.flags).toContain("no_serving_size");
  });

  it("ignores excluded results", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 80,
      measurements: [m({ valuePer100g: 6 }), m({ valuePer100g: 35, excluded: true })],
    });
    expect(r.counted).toBe(1);
    expect(r.median).toBe(6);
    expect(r.flags).not.toContain("studies_disagree");
  });

  it("treats results 20+ years older than the newest as reference only", () => {
    const old = m({ valuePer100g: 90, studyYear: 1985 });
    const r = computeRating({
      property: "oxalate",
      servingGrams: 100,
      measurements: [old, m({ valuePer100g: 10, studyYear: 2017 })],
    });
    expect(r.counted).toBe(1);
    expect(r.superseded).toEqual([old.id]);
    expect(r.median).toBe(10);
  });

  it("is unknown when every result is excluded", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 100,
      measurements: [m({ valuePer100g: 10, excluded: true })],
    });
    expect(r.level).toBeNull();
    expect(r.counted).toBe(0);
  });

  it("has no rule yet for amounts on other properties", () => {
    const r = computeRating({ property: "lectin", servingGrams: 100, measurements: [m({ valuePer100g: 10 })] });
    expect(r.level).toBeNull();
    expect(r.flags).toContain("no_rule");
  });
});

describe("computeRating — list sources (e.g. SIGHI)", () => {
  it("uses the stated level", () => {
    const r = computeRating({ property: "histamine", servingGrams: null, measurements: [m({ reportedLevel: "high" })] });
    expect(r.level).toBe("high");
    expect(r.method).toBe("reported");
  });

  it("when lists disagree, takes the higher level and flags it", () => {
    const r = computeRating({
      property: "histamine",
      servingGrams: null,
      measurements: [m({ reportedLevel: "low" }), m({ reportedLevel: "high" })],
    });
    expect(r.level).toBe("high");
    expect(r.flags).toContain("studies_disagree");
  });

  it("lab amounts outrank list levels", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 100,
      measurements: [m({ valuePer100g: 3 }), m({ reportedLevel: "high" })],
    });
    expect(r.method).toBe("median");
    expect(r.level).toBe("low");
    expect(r.flags).toContain("studies_disagree");
  });
});

describe("computeRating — admin review", () => {
  const disagreeing = () => [m({ valuePer100g: 1 }), m({ valuePer100g: 100 })];

  it("a review after the last change clears needsReview", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 100,
      measurements: disagreeing(),
      reviewedAt: new Date("2026-11-02T00:00:00Z"),
    });
    expect(r.flags).toContain("studies_disagree");
    expect(r.needsReview).toBe(false);
  });

  it("a change after the review makes it stale again", () => {
    const r = computeRating({
      property: "oxalate",
      servingGrams: 100,
      measurements: [...disagreeing(), m({ valuePer100g: 50, updatedAt: new Date("2026-11-03T00:00:00Z") })],
      reviewedAt: new Date("2026-11-02T00:00:00Z"),
    });
    expect(r.needsReview).toBe(true);
  });
});

describe("computeRating — histamine (content, mg/kg)", () => {
  // Stored per 100 g: 3.177 mg/100 g = 31.77 mg/kg.
  const hist = (values: number[], servingGrams: number | null = null) =>
    computeRating({
      property: "histamine",
      servingGrams,
      measurements: values.map((v) => m({ valuePer100g: v / 10 })),
    });

  it("ranks content against the approved bands", () => {
    const band = (mgPerKg: number) => hist([mgPerKg]).band;
    expect(band(0)).toBe("ND");
    expect(band(0.3)).toBe("L");
    expect(band(9.9)).toBe("L");
    expect(band(10)).toBe("M");
    expect(band(49.9)).toBe("M");
    expect(band(50)).toBe("H");
    expect(band(199)).toBe("H");
    expect(band(200)).toBe("VH");
    expect(hist([0]).level).toBe("low");
    expect(hist([1000]).level).toBe("very_high");
  });

  it("doesn't need a serving size, but shows the amount in one when known", () => {
    const noServing = hist([31.77]);
    expect(noServing.level).toBe("moderate");
    expect(noServing.flags).not.toContain("no_serving_size");
    expect(noServing.amount).toBeCloseTo(31.77);
    expect(noServing.amountUnit).toBe("mg/kg");
    expect(noServing.perServing).toBeNull();

    const withServing = hist([31.77], 30);
    expect(withServing.perServing).toBeCloseTo(0.953);
  });

  it("not detected next to a trace is not a disagreement; low next to moderate is", () => {
    expect(hist([0, 1.9]).flags).not.toContain("studies_disagree");
    expect(hist([31.77, 16, 26]).flags).not.toContain("studies_disagree");
    expect(hist([2.51, 6, 22]).flags).toContain("studies_disagree");
  });
});

describe("computeRating — tyramine (content, mg/kg)", () => {
  const tyr = (mgPerKg: number) =>
    computeRating({ property: "tyramine", servingGrams: null, measurements: [m({ valuePer100g: mgPerKg / 10 })] });

  it("uses the histamine cutoffs", () => {
    expect(tyr(0).band).toBe("ND");
    expect(tyr(9.9).level).toBe("low");
    expect(tyr(10).level).toBe("moderate");
    expect(tyr(50).level).toBe("high");
    expect(tyr(200).level).toBe("very_high");
    expect(tyr(50).amountUnit).toBe("mg/kg");
    expect(tyr(50).flags).not.toContain("no_rule");
  });
});

describe("computeRating — admin override", () => {
  const blue = [0, 0, 0, 2900, 5130].map((v) => m({ valuePer100g: v / 10 }));

  it("replaces the middle value and is flagged", () => {
    const r = computeRating({ property: "tyramine", servingGrams: null, measurements: blue, overrideLevel: "very_high" });
    expect(r.level).toBe("very_high");
    expect(r.flags).toContain("admin_override");
    expect(r.median).toBe(0);
  });

  it("is ignored without counted results or with a bad value", () => {
    expect(computeRating({ property: "tyramine", servingGrams: null, measurements: [], overrideLevel: "high" }).level).toBeNull();
    expect(computeRating({ property: "tyramine", servingGrams: null, measurements: blue, overrideLevel: "nope" }).level).toBe("low");
  });
});

describe("computeRating — FODMAP (Varney 2017 cutoffs)", () => {
  type Serve = Partial<Record<"fructans" | "gos" | "sorbitol" | "mannitol" | "excess_fructose" | "lactose", number>>;
  // Varney 2017 Table 2 gives grams per serve; store as per 100 g like an import would.
  const rate = (grams: number, category: string, serve: Serve) =>
    computeRating({
      property: "fodmap",
      servingGrams: grams,
      category,
      measurements: Object.entries(serve).map(([component, g]) =>
        m({ component, valuePer100g: ((g as number) / grams) * 100 })
      ),
    });
  const all0 = { fructans: 0, gos: 0, sorbitol: 0, mannitol: 0, excess_fructose: 0 };

  it("reproduces the paper's own ratings (Table 2)", () => {
    expect(rate(165, "Fruits", { ...all0, sorbitol: 1.37, excess_fructose: 10.6 }).level).toBe("high"); // apple
    expect(rate(130, "Fruits", all0).level).toBe("low"); // orange
    expect(rate(74, "Vegetables", { ...all0, sorbitol: 0.08, mannitol: 1.95 }).level).toBe("high"); // mushroom
    expect(rate(36, "Vegetables", { ...all0, gos: 0.07, fructans: 0.65 }).level).toBe("high"); // onion
    expect(rate(66, "Vegetables", { ...all0, fructans: 0.19 }).level).toBe("low"); // zucchini
    expect(rate(49, "Grains & Starches", { ...all0, gos: 0.1, fructans: 0.33, excess_fructose: 0.08 }).level).toBe("high"); // wheat bread
    expect(rate(52, "Grains & Starches", { ...all0, gos: 0.07, fructans: 0.1, excess_fructose: 0.12 }).level).toBe("low"); // GF bread
    expect(rate(155, "Grains & Starches", { ...all0, fructans: 0.22 }).level).toBe("low"); // quinoa pasta
    expect(rate(88, "Grains & Legumes", { ...all0, gos: 0.96, fructans: 0.23 }).level).toBe("high"); // haricot beans
  });

  it("uses the grain cutoff for oligos only in grains, legumes, nuts and seeds", () => {
    expect(rate(100, "Grains & Legumes", { ...all0, fructans: 0.25 }).level).toBe("low");
    expect(rate(100, "Vegetables", { ...all0, fructans: 0.25 }).level).toBe("high");
  });

  it("allows 0.40 g excess fructose only for produce with no other FODMAP", () => {
    expect(rate(100, "Fruits", { ...all0, excess_fructose: 0.3 }).level).toBe("low");
    expect(rate(100, "Fruits", { ...all0, excess_fructose: 0.3, sorbitol: 0.1 }).level).toBe("high");
    expect(rate(100, "Proteins", { ...all0, excess_fructose: 0.3 }).level).toBe("high");
  });

  it("checks combined polyols", () => {
    expect(rate(100, "Fruits", { ...all0, sorbitol: 0.19, mannitol: 0.19 }).level).toBe("low");
    expect(rate(100, "Fruits", { ...all0, sorbitol: 0.19, mannitol: 0.21 }).level).toBe("high");
  });

  it("won't call a food low until every sugar is tested, but one over is enough for high", () => {
    const partial = rate(100, "Fruits", { fructans: 0.01 });
    expect(partial.level).toBeNull();
    expect(partial.flags).toContain("fodmap_incomplete");
    expect(partial.fodmap?.missing).toEqual(["gos", "sorbitol", "mannitol", "excess_fructose"]);
    expect(rate(100, "Fruits", { sorbitol: 2 }).level).toBe("high");
  });

  it("needs lactose tested for dairy", () => {
    expect(rate(250, "Dairy & Alternatives", all0).level).toBeNull();
    expect(rate(250, "Dairy & Alternatives", { ...all0, lactose: 12 }).level).toBe("high");
    expect(rate(250, "Dairy & Alternatives", { ...all0, lactose: 0.5 }).level).toBe("low");
  });

  it("lets a list fill a partial lab result, and flags a list that disagrees with a full one", () => {
    const list = (level: string) => m({ reportedLevel: level });
    const partial = computeRating({
      property: "fodmap", servingGrams: 100, category: "Vegetables",
      measurements: [m({ component: "fructans", valuePer100g: 0.05 }), list("low")],
    });
    expect(partial.level).toBe("low");
    expect(partial.method).toBe("reported");
    expect(partial.flags).not.toContain("fodmap_incomplete");

    const full = computeRating({
      property: "fodmap", servingGrams: 100, category: "Fruits",
      measurements: [
        ...Object.entries(all0).map(([component, v]) => m({ component, valuePer100g: v })),
        list("high"),
      ],
    });
    expect(full.level).toBe("low");
    expect(full.flags).toContain("studies_disagree");

    expect(computeRating({ property: "fodmap", servingGrams: null, measurements: [list("high")] }).level).toBe("high");
  });

  it("needs a serving size", () => {
    const r = computeRating({ property: "fodmap", servingGrams: null, category: "Fruits", measurements: [m({ component: "sorbitol", valuePer100g: 2 })] });
    expect(r.level).toBeNull();
    expect(r.flags).toContain("no_serving_size");
    const withList = computeRating({ property: "fodmap", servingGrams: null, category: "Fruits", measurements: [m({ component: "lactose", valuePer100g: 0 }), m({ reportedLevel: "low" })] });
    expect(withList.level).toBe("low");
  });
});

describe("computeRating — permission-pending lists", () => {
  const pending = (level: string) => m({ reportedLevel: level, sourceUse: "check" });

  it("never count toward the rating", () => {
    const r = computeRating({
      property: "histamine",
      servingGrams: null,
      measurements: [m({ valuePer100g: 0 }), pending("high")],
    });
    expect(r.level).toBe("low");
    expect(r.counted).toBe(1);
    expect(r.flags).not.toContain("studies_disagree");
    expect(r.needsReview).toBe(false);
  });

  it("flag when they rate the food differently", () => {
    const r = computeRating({
      property: "histamine",
      servingGrams: null,
      measurements: [m({ valuePer100g: 0 }), pending("high")],
    });
    expect(r.flags).toContain("lists_disagree");

    const agree = computeRating({
      property: "histamine",
      servingGrams: null,
      measurements: [m({ valuePer100g: 0 }), pending("low")],
    });
    expect(agree.flags).not.toContain("lists_disagree");
  });

  it("leave the food unknown when they are all we have", () => {
    const r = computeRating({ property: "lectin", servingGrams: null, measurements: [pending("high")] });
    expect(r.level).toBeNull();
    expect(r.counted).toBe(0);
    expect(r.flags).toEqual(["pending_list_only"]);
  });

  it("ignore an excluded pending result", () => {
    const r = computeRating({
      property: "lectin",
      servingGrams: null,
      measurements: [m({ reportedLevel: "high", sourceUse: "check", excluded: true })],
    });
    expect(r.flags).toEqual([]);
  });
});
