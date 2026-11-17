import { describe, expect, it } from "vitest";
import { daySummary } from "./day-summary";

describe("daySummary", () => {
  it("says how the day felt in words, in a fixed order, only for what was filled in", () => {
    expect(daySummary({ energyScore: 4, sleepScore: 6 }).felt).toEqual(["OK sleep", "Some energy"]);
  });

  it("reads stress and pain from their good end (10 = calm, no pain)", () => {
    expect(daySummary({ stressScore: 3, painScore: 8 }).felt).toEqual(["Stressed", "Little or no pain"]);
    expect(daySummary({ stressScore: 6, painScore: 3 }).felt).toEqual(["A bit stressed", "A lot of pain"]);
  });

  it("uses the same 1–3 / 4–6 / 7–10 steps as symptom severity", () => {
    expect([1, 3, 4, 6, 7, 10].map((v) => daySummary({ sleepScore: v }).felt[0])).toEqual([
      "Poor sleep", "Poor sleep", "OK sleep", "OK sleep", "Good sleep", "Good sleep",
    ]);
  });

  it("keeps what happened apart from how it felt", () => {
    expect(daySummary({ moodScore: 8, cycleDay: 10, meditationMinutes: 15, activityLevel: "light" })).toEqual({
      felt: ["Good mood"],
      did: ["Cycle day 10", "Meditated 15 min", "Light activity"],
    });
  });

  it("skips empty journals and no-activity days", () => {
    expect(daySummary(null)).toEqual({ felt: [], did: [] });
    expect(daySummary({ activityLevel: "none", meditationMinutes: 0 })).toEqual({ felt: [], did: [] });
  });
});
