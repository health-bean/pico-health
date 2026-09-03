import { describe, it, expect } from "vitest";
import { CLARIFIER_RULES, ANSWER_LABELS } from "./rules";

describe("CLARIFIER_RULES integrity", () => {
  it("every rule is complete and well-formed", () => {
    for (const rule of CLARIFIER_RULES) {
      expect(rule.id).toMatch(/^[a-z-]+$/);
      expect(rule.axes.length).toBeGreaterThan(0);
      expect(rule.question).toContain("{food}");
      expect(rule.why.length).toBeGreaterThan(0);
      expect(rule.options.length).toBeGreaterThanOrEqual(2);
      const values = rule.options.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("ids and priorities are unique so selection is deterministic", () => {
    const ids = CLARIFIER_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const priorities = CLARIFIER_RULES.map((r) => r.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it("preparation options only use values the extractor/insights already understand plus 'fresh'", () => {
    const prep = CLARIFIER_RULES.find((r) => r.dimension === "preparation")!;
    const allowed = ["fresh", "leftover", "fermented", "aged", "cured", "canned", "smoked", "dried", "raw"];
    for (const o of prep.options) expect(allowed).toContain(o.value);
  });

  it("exposes a label for every answer value", () => {
    for (const rule of CLARIFIER_RULES) {
      for (const o of rule.options) expect(ANSWER_LABELS[o.value]).toBe(o.label);
    }
  });
});
