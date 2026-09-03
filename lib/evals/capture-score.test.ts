import { describe, it, expect } from "vitest";
import { normalizeName, nameMatchScore, scoreFixture, aggregate } from "./capture-score";
import type { Fixture, ActualEntry } from "./capture-score";

const base: Fixture = {
  id: "t1",
  category: "simple-meal",
  input: "salmon and rice for lunch",
  at: "12:30",
  expect: {
    entries: [
      { entryType: "food", name: "salmon" },
      { entryType: "food", name: "rice", alsoAccept: ["white rice"] },
    ],
    mealType: "lunch",
  },
};

const food = (name: string, extra: Partial<ActualEntry> = {}): ActualEntry => ({
  entryType: "food",
  name,
  mealType: "lunch",
  preparation: [],
  ...extra,
});

describe("normalizeName", () => {
  it("lowercases, strips punctuation, drops filler, singularizes", () => {
    expect(normalizeName("Some Fresh Eggs!")).toBe("egg");
    expect(normalizeName("Sweet-Potato")).toBe("sweet potato");
  });

  it("singularizes plurals but leaves short and double-s words intact", () => {
    expect(normalizeName("figs")).toBe("fig");
    expect(normalizeName("bass")).toBe("bass");
    // Singular/plural both normalize to the same token, which is the point:
    expect(normalizeName("oats")).toBe(normalizeName("oat"));
  });
});

describe("nameMatchScore", () => {
  it("scores exact, alias, and subset matches in that order", () => {
    const exp = { entryType: "food", name: "rice", alsoAccept: ["white rice"] };
    expect(nameMatchScore(exp, "rice")).toBe(3);
    expect(nameMatchScore(exp, "white rice")).toBe(2);
    expect(nameMatchScore(exp, "rice, jasmine")).toBe(1);
    expect(nameMatchScore(exp, "quinoa")).toBe(0);
  });

  it("matches when the model is more specific than the fixture", () => {
    expect(nameMatchScore({ entryType: "food", name: "salmon" }, "baked salmon")).toBeGreaterThan(0);
  });
});

describe("scoreFixture", () => {
  it("marks a fully correct extraction perfect", () => {
    const s = scoreFixture(base, [food("salmon"), food("white rice")]);
    expect(s.perfect).toBe(true);
    expect(s.matchedCount).toBe(2);
    expect(s.missed).toEqual([]);
    expect(s.extra).toEqual([]);
    expect(s.mealTypeOk).toBe(true);
  });

  it("records misses and extras without double-counting", () => {
    const s = scoreFixture(base, [food("salmon"), food("broccoli")]);
    expect(s.perfect).toBe(false);
    expect(s.missed).toEqual(["food:rice"]);
    expect(s.extra).toEqual(["food:broccoli"]);
  });

  it("fails on the wrong meal type", () => {
    const s = scoreFixture(base, [food("salmon", { mealType: "dinner" }), food("rice", { mealType: "dinner" })]);
    expect(s.mealTypeOk).toBe(false);
    expect(s.perfect).toBe(false);
  });

  it("catches forbidden names — the hallucination guard", () => {
    const negation: Fixture = {
      id: "neg",
      category: "negation-and-traps",
      input: "skipped breakfast, no dairy today",
      expect: { entries: [], forbidNames: ["dairy", "breakfast"] },
    };
    const clean = scoreFixture(negation, []);
    expect(clean.perfect).toBe(true);

    const hallucinated = scoreFixture(negation, [food("dairy")]);
    expect(hallucinated.forbidden).toContain("dairy");
    expect(hallucinated.perfect).toBe(false);
  });

  it("does not fire a forbid on an entry that legitimately matched an expectation", () => {
    // "migraine" is expected; "headache" is forbidden. The output "migraine headache"
    // satisfies the expectation and must not also count as a hallucination.
    const fixture: Fixture = {
      id: "migraine",
      category: "symptom",
      input: "bad migraine, about an 8",
      expect: {
        entries: [{ entryType: "symptom", name: "migraine", severity: 8 }],
        forbidNames: ["headache"],
      },
    };
    const s = scoreFixture(fixture, [{ entryType: "symptom", name: "migraine headache", severity: 8 }]);
    expect(s.matchedCount).toBe(1);
    expect(s.forbidden).toEqual([]);
    expect(s.perfect).toBe(true);

    // A separate, genuinely extra headache entry still trips the guard.
    const withExtra = scoreFixture(fixture, [
      { entryType: "symptom", name: "migraine", severity: 8 },
      { entryType: "symptom", name: "headache" },
    ]);
    expect(withExtra.forbidden).toContain("headache");
    expect(withExtra.perfect).toBe(false);
  });

  it("judges preparation and severity only when the fixture states them", () => {
    const fixture: Fixture = {
      id: "prep",
      category: "preparation",
      input: "last night's chicken, headache about a 7",
      expect: {
        entries: [
          { entryType: "food", name: "chicken", preparation: ["leftover"] },
          { entryType: "symptom", name: "headache", severity: 7 },
        ],
        mealType: "lunch",
      },
    };
    const good = scoreFixture(fixture, [
      food("chicken", { preparation: ["leftover"] }),
      { entryType: "symptom", name: "headache", severity: 7 },
    ]);
    expect(good.preparationOk).toBe(true);
    expect(good.severityOk).toBe(true);
    expect(good.perfect).toBe(true);

    const bad = scoreFixture(fixture, [
      food("chicken"),
      { entryType: "symptom", name: "headache", severity: 3 },
    ]);
    expect(bad.preparationOk).toBe(false);
    expect(bad.severityOk).toBe(false);
    expect(bad.perfect).toBe(false);

    expect(scoreFixture(base, [food("salmon"), food("rice")]).preparationOk).toBeNull();
  });
});

describe("aggregate", () => {
  it("computes perfect rate, F1, and per-category breakdown", () => {
    const perfect = scoreFixture(base, [food("salmon"), food("rice")]);
    const partial = scoreFixture(base, [food("salmon"), food("broccoli")]);
    const agg = aggregate([perfect, partial]);

    expect(agg.fixtures).toBe(2);
    expect(agg.perfect).toBe(1);
    expect(agg.perfectRate).toBe(0.5);
    // 3 matched of 4 expected; one extra.
    expect(agg.entryRecall).toBeCloseTo(0.75);
    expect(agg.entryPrecision).toBeCloseTo(0.75);
    expect(agg.entryF1).toBeCloseTo(0.75);
    expect(agg.hallucinationRate).toBe(0.5);
    expect(agg.byCategory["simple-meal"].fixtures).toBe(2);
  });

  it("reports n/a for dimensions no fixture tested", () => {
    const agg = aggregate([scoreFixture(base, [food("salmon"), food("rice")])]);
    expect(agg.preparationAccuracy).toBeNull();
    expect(agg.severityAccuracy).toBeNull();
    expect(agg.mealTypeAccuracy).toBe(1);
  });
});
