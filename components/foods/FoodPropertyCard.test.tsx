import { describe, it, expect } from "vitest";
import { getLevelColor, getBooleanColor, formatLevel } from "./FoodPropertyCard";

describe("FoodPropertyCard level colors", () => {
  it("climbs one ramp from low to very high", () => {
    expect(getLevelColor("none")).toEqual(getLevelColor("low"));
    expect(getLevelColor("low").bg).toBe("bg-level-1-bg");
    expect(getLevelColor("moderate").bg).toBe("bg-level-2-bg");
    expect(getLevelColor("high").bg).toBe("bg-level-3-bg");
    expect(getLevelColor("very_high").bg).toBe("bg-level-4-bg");
  });

  it("keeps text and ring on the same step as the background", () => {
    for (const level of ["low", "moderate", "high", "very_high"] as const) {
      const c = getLevelColor(level);
      const step = c.bg.match(/level-(\d)/)?.[1];
      expect(c.text).toBe(`text-level-${step}-fg`);
      expect(c.ring).toBe(`ring-level-${step}-fg/20`);
    }
  });

  it("falls back to warm neutrals for unknown", () => {
    expect(getLevelColor("unknown")).toEqual({
      bg: "bg-warm-50",
      text: "text-warm-600",
      ring: "ring-warm-500/20",
    });
  });

  it("maps a present boolean property to the high step and absent to low", () => {
    expect(getBooleanColor(true)).toEqual(getLevelColor("high"));
    expect(getBooleanColor(false)).toEqual(getLevelColor("low"));
  });

  it("formats all trigger levels", () => {
    expect(formatLevel("none")).toBe("None");
    expect(formatLevel("low")).toBe("Low");
    expect(formatLevel("moderate")).toBe("Moderate");
    expect(formatLevel("high")).toBe("High");
    expect(formatLevel("very_high")).toBe("Very High");
    expect(formatLevel("unknown")).toBe("Unknown");
  });
});
