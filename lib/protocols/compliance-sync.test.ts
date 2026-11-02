import { describe, it, expect } from "vitest";
import { checkComplianceSync, type ProtocolContext } from "./compliance";

const lowOxalate: ProtocolContext = {
  rules: [
    { ruleType: "property", propertyName: "oxalate", propertyValues: ["high", "very_high"], status: "avoid", notes: null },
    { ruleType: "property", propertyName: "oxalate", propertyValues: ["moderate"], status: "moderation", notes: null },
  ],
  overrides: new Map(),
};

describe("checkComplianceSync with unrated properties", () => {
  it("is 'unknown', not 'allowed', when a restricted property has no rating", () => {
    const result = checkComplianceSync(lowOxalate, { oxalate: "unknown" });
    expect(result.status).toBe("unknown");
    expect(result.violations).toEqual(["Oxalate not rated yet"]);
  });

  it("treats a missing rating the same as unknown", () => {
    expect(checkComplianceSync(lowOxalate, {}).status).toBe("unknown");
    expect(checkComplianceSync(lowOxalate, { oxalate: null }).status).toBe("unknown");
  });

  it("still allows a food rated low", () => {
    expect(checkComplianceSync(lowOxalate, { oxalate: "low" })).toEqual({ status: "allowed", violations: [] });
  });

  it("a known avoid wins over an unknown on another property", () => {
    const ctx: ProtocolContext = {
      rules: [
        ...lowOxalate.rules,
        { ruleType: "property", propertyName: "histamine", propertyValues: ["high"], status: "avoid", notes: null },
      ],
      overrides: new Map(),
    };
    const result = checkComplianceSync(ctx, { oxalate: "unknown", histamine: "high" });
    expect(result.status).toBe("avoid");
  });

  it("ignores properties the protocol doesn't restrict", () => {
    expect(checkComplianceSync(lowOxalate, { oxalate: "low", histamine: "unknown" }).status).toBe("allowed");
  });

  it("a food override still wins", () => {
    const ctx: ProtocolContext = {
      ...lowOxalate,
      overrides: new Map([["f1", { foodId: "f1", status: "allowed", overrideReason: null }]]),
    };
    expect(checkComplianceSync(ctx, { oxalate: "unknown" }, "f1").status).toBe("allowed");
  });
});

const lowHistamine: ProtocolContext = {
  rules: [
    { ruleType: "property", propertyName: "histamine", propertyValues: ["low"], status: "allowed", notes: null },
    { ruleType: "property", propertyName: "histamine", propertyValues: ["high"], status: "avoid", notes: null },
    { ruleType: "property", propertyName: "histamine", propertyValues: ["moderate"], status: "caution", notes: null },
  ],
  overrides: new Map(),
};

describe("checkComplianceSync level matching (production rule shapes)", () => {
  it("'avoid high' also covers very_high", () => {
    expect(checkComplianceSync(lowHistamine, { histamine: "very_high" }).status).toBe("avoid");
  });

  it("'caution' rules count as moderation", () => {
    const result = checkComplianceSync(lowHistamine, { histamine: "moderate" });
    expect(result.status).toBe("moderation");
    expect(result.violations).toEqual(["Histamine (moderate) should be limited"]);
  });

  it("low stays allowed", () => {
    expect(checkComplianceSync(lowHistamine, { histamine: "low" }).status).toBe("allowed");
  });

  it("boolean rules still match exactly", () => {
    const aip: ProtocolContext = {
      rules: [{ ruleType: "property", propertyName: "nightshade", propertyValues: ["true"], status: "avoid", notes: null }],
      overrides: new Map(),
    };
    expect(checkComplianceSync(aip, { nightshade: true }).status).toBe("avoid");
    expect(checkComplianceSync(aip, { nightshade: false }).status).toBe("allowed");
  });
});

describe("checkComplianceSync — partly rated foods and yes/no facts", () => {
  // The production Low Histamine shape: histamine plus amines and tyramine.
  const lowHistamine: ProtocolContext = {
    rules: [
      { ruleType: "property", propertyName: "histamine", propertyValues: ["low"], status: "allowed", notes: null },
      { ruleType: "property", propertyName: "histamine", propertyValues: ["high"], status: "avoid", notes: null },
      { ruleType: "property", propertyName: "histamine", propertyValues: ["moderate"], status: "caution", notes: null },
      { ruleType: "property", propertyName: "amines", propertyValues: ["high"], status: "avoid", notes: null },
      { ruleType: "property", propertyName: "tyramine", propertyValues: ["high"], status: "avoid", notes: null },
      { ruleType: "property", propertyName: "histamine_liberator", propertyValues: ["true"], status: "caution", notes: null },
    ],
    overrides: new Map(),
  };

  it("uses the rated property and lists the unrated ones", () => {
    const r = checkComplianceSync(lowHistamine, { histamine: "low", amines: "unknown", tyramine: "unknown" });
    expect(r.status).toBe("allowed");
    expect(r.violations).toEqual(["Amines not rated yet", "Tyramine not rated yet"]);
  });

  it("is unknown when the only fact is a yes/no 'no'", () => {
    const r = checkComplianceSync(lowHistamine, { histamine: "unknown" });
    expect(r.status).toBe("unknown");
    expect(r.violations).toEqual(["Histamine not rated yet", "Amines not rated yet", "Tyramine not rated yet"]);
  });

  it("a liberator is still flagged when its histamine content is unrated", () => {
    expect(checkComplianceSync(lowHistamine, { histamine_liberator: true }).status).toBe("moderation");
  });

  it("flags a histamine liberator as limit-and-test", () => {
    const r = checkComplianceSync(lowHistamine, { histamine: "low", histamine_liberator: true });
    expect(r.status).toBe("moderation");
    expect(r.violations[0]).toBe("May release histamine: limit and test your tolerance");
  });

  it("treats a missing yes/no fact as no", () => {
    const aip: ProtocolContext = {
      rules: [{ ruleType: "property", propertyName: "nightshade", propertyValues: ["true"], status: "avoid", notes: null }],
      overrides: new Map(),
    };
    expect(checkComplianceSync(aip, {}).status).toBe("allowed");
    expect(checkComplianceSync(aip, { nightshade: null }).status).toBe("allowed");
  });
});
