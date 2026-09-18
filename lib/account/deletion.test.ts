import { describe, it, expect } from "vitest";
import { GRACE_DAYS, purgeDateFrom, daysLeft } from "./deletion";

describe("account deletion window", () => {
  const requested = new Date("2026-09-18T10:00:00Z");

  it("purges 30 days after the request", () => {
    expect(GRACE_DAYS).toBe(30);
    expect(purgeDateFrom(requested).toISOString()).toBe("2026-10-18T10:00:00.000Z");
  });

  it("counts the days left", () => {
    expect(daysLeft(requested, new Date("2026-09-18T10:00:00Z"))).toBe(30);
    expect(daysLeft(requested, new Date("2026-10-17T10:00:00Z"))).toBe(1);
  });

  it("never goes below zero once the window has passed", () => {
    expect(daysLeft(requested, new Date("2026-11-01T10:00:00Z"))).toBe(0);
  });
});
