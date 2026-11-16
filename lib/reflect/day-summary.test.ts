import { describe, expect, it } from "vitest";
import { daySummaryParts } from "./day-summary";

describe("daySummaryParts", () => {
  it("shows only what was filled in, in a fixed order", () => {
    expect(daySummaryParts({ energyScore: 4, sleepScore: 6, cycleDay: 22 })).toEqual(["Sleep 6/10", "Energy 4/10", "Cycle day 22"]);
  });
  it("labels stress and pain by their good end", () => {
    expect(daySummaryParts({ stressScore: 3, painScore: 8 })).toEqual(["Calm 3/10", "Pain-free 8/10"]);
  });
  it("skips empty journals and no-activity days", () => {
    expect(daySummaryParts(null)).toEqual([]);
    expect(daySummaryParts({ activityLevel: "none", meditationMinutes: 0 })).toEqual([]);
    expect(daySummaryParts({ activityLevel: "light" })).toEqual(["Light activity"]);
  });
});
