import { describe, expect, it } from "vitest";
import { FIT_TONE_CLASS, FIT_TONE_SYMBOL, fitLine, personalStatus, shortDietName, statusTone } from "./fit-line";

describe("shortDietName", () => {
  it("drops the long form in brackets", () => {
    expect(shortDietName("AIP (Autoimmune Protocol)")).toBe("AIP");
    expect(shortDietName("Low FODMAP")).toBe("Low FODMAP");
  });
});

describe("fitLine", () => {
  it("names the diet when a food is allowed", () => {
    expect(fitLine({ diet: "Low FODMAP", status: "allowed", reasons: [] })).toEqual({
      tone: "allowed",
      text: "Allowed on Low FODMAP",
    });
  });

  it("leads with the reason when a food is out", () => {
    expect(fitLine({ diet: "AIP", status: "avoid", reasons: ["Nightshade not allowed"] }).text).toBe(
      "Avoid on AIP: nightshade"
    );
    expect(fitLine({ diet: "AIP", status: "avoid", reasons: ["Grains not allowed"] }).text).toBe(
      "Avoid on AIP: grains"
    );
  });

  it("reads level-first for limits", () => {
    expect(
      fitLine({ diet: "Low Histamine", status: "moderation", reasons: ["Histamine (moderate) should be limited"] }).text
    ).toBe("Limit on Low Histamine: moderate histamine");
    expect(
      fitLine({ diet: "Low Histamine", status: "moderation", reasons: ["May release histamine: limit and test your tolerance"] }).text
    ).toBe("Limit on Low Histamine: may release histamine");
  });

  it("says not rated yet instead of guessing", () => {
    expect(
      fitLine({ diet: "Low Histamine", status: "unknown", reasons: ["Histamine not rated yet"] })
    ).toEqual({ tone: "unknown", text: "Not rated yet for Low Histamine" });
  });

  it("leaves 'not rated yet' notes out of an avoid reason", () => {
    expect(
      fitLine({ diet: "Low Histamine", status: "avoid", reasons: ["Tyramine (very_high) not allowed", "Histamine not rated yet"] }).text
    ).toBe("Avoid on Low Histamine: very high tyramine");
  });
});

describe("personal ratings", () => {
  it("outrank the diet rule", () => {
    expect(
      fitLine({ diet: "AIP", status: "avoid", reasons: ["Eggs not allowed"], personal: { status: "safe", source: "trial" } })
    ).toEqual({ tone: "allowed", text: "Fine for you · passed reintroduction" });
    expect(
      fitLine({ diet: "Low FODMAP", status: "allowed", reasons: [], personal: { status: "unsafe", source: "self" } })
    ).toEqual({ tone: "avoid", text: "Not for you" });
  });

  it("show for people with no diet", () => {
    expect(fitLine({ diet: null, status: "allowed", reasons: [], personal: { status: "sensitive", source: "self" } })).toEqual({
      tone: "limit",
      text: "Small amounts for you",
    });
  });

  it("no diet and no rating means no line", () => {
    expect(fitLine({ diet: null, status: "allowed", reasons: [] })).toBeNull();
  });

  it("decide the status insights use", () => {
    expect(personalStatus("avoid", { status: "safe", source: "trial" })).toBe("allowed");
    expect(personalStatus("allowed", { status: "unsafe", source: "self" })).toBe("avoid");
    expect(personalStatus("moderation", null)).toBe("moderation");
  });
});

describe("fit tones", () => {
  it("map each diet status to one tone", () => {
    expect(statusTone("allowed")).toBe("allowed");
    expect(statusTone("moderation")).toBe("limit");
    expect(statusTone("caution")).toBe("limit");
    expect(statusTone("avoid")).toBe("avoid");
    expect(statusTone("unknown")).toBe("unknown");
    expect(statusTone(undefined)).toBe("unknown");
  });

  it("agree with the card line", () => {
    for (const status of ["allowed", "moderation", "caution", "avoid", "unknown"]) {
      expect(fitLine({ diet: "AIP", status, reasons: [] })?.tone).toBe(statusTone(status));
    }
  });

  it("give Avoid, Limit and Allowed three distinct colours: brick, ochre, teal", () => {
    expect(FIT_TONE_CLASS.avoid.text).toContain("brick-600");
    expect(FIT_TONE_CLASS.limit.text).toContain("ochre-700");
    expect(FIT_TONE_CLASS.allowed.text).toContain("teal-700");
    const texts = new Set([FIT_TONE_CLASS.avoid.text, FIT_TONE_CLASS.limit.text, FIT_TONE_CLASS.allowed.text]);
    expect(texts.size).toBe(3);
  });

  it("give Allowed, Limit and Avoid three different symbols, so colour isn't the only signal", () => {
    expect(FIT_TONE_SYMBOL).toMatchObject({ allowed: "check", limit: "minus", avoid: "x", unknown: null });
    expect(new Set([FIT_TONE_SYMBOL.allowed, FIT_TONE_SYMBOL.limit, FIT_TONE_SYMBOL.avoid]).size).toBe(3);
  });

  it("never use traffic-light red or green", () => {
    for (const t of Object.values(FIT_TONE_CLASS)) {
      expect(`${t.text} ${t.chip}`).not.toMatch(/danger|red-|olive|success|green/);
    }
  });
});
