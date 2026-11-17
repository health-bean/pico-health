import { describe, expect, it } from "vitest";
import { goalStatus } from "./tracking-goal";

const at = (d: string) => new Date(d + "T15:00:00");

describe("goalStatus", () => {
  it("is off the Log without a goal", () => {
    expect(goalStatus({ trackingGoalDays: null, trackingGoalStartDate: null }, at("2026-11-16"))).toMatchObject({
      hasGoal: false,
      showOnLog: false,
    });
  });

  it("counts day N of the goal while it runs, including the last day", () => {
    const s = { trackingGoalDays: 30, trackingGoalStartDate: "2026-11-01" };
    expect(goalStatus(s, at("2026-11-01"))).toMatchObject({ day: 1, total: 30, showOnLog: true, done: false });
    expect(goalStatus(s, at("2026-11-12"))).toMatchObject({ day: 12, showOnLog: true });
    expect(goalStatus(s, at("2026-11-30"))).toMatchObject({ day: 30, showOnLog: true, done: false });
  });

  it("leaves the Log once the goal is reached", () => {
    const s = { trackingGoalDays: 30, trackingGoalStartDate: "2026-10-01" };
    expect(goalStatus(s, at("2026-11-16"))).toMatchObject({ day: 30, done: true, showOnLog: false });
  });
});
