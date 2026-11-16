import { describe, expect, it } from "vitest";
import { fitLine, personalStatus, shortDietName } from "./fit-line";

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
