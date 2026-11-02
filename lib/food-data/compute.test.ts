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
