import { describe, it, expect } from "vitest";
import { resolveWhen } from "./use-quick-log";

// A fixed "now": Wed 2026-09-16 at 14:05 local time.
const now = new Date(2026, 8, 16, 14, 5);

describe("resolveWhen", () => {
  it("logs to today at the current time by default", () => {
    expect(resolveWhen({ mode: "now", time: "" }, now)).toEqual({
      entryDate: "2026-09-16",
      entryTime: "14:05",
    });
  });

  it("uses the chosen time for 'earlier today'", () => {
    expect(resolveWhen({ mode: "earlier", time: "08:30" }, now)).toEqual({
      entryDate: "2026-09-16",
      entryTime: "08:30",
    });
  });

  it("steps back a day for 'yesterday'", () => {
    expect(resolveWhen({ mode: "yesterday", time: "19:00" }, now)).toEqual({
      entryDate: "2026-09-15",
      entryTime: "19:00",
    });
  });

  it("lands on the day being viewed when backfilling a past day", () => {
    expect(resolveWhen({ mode: "now", time: "" }, now, "2026-09-12")).toEqual({
      entryDate: "2026-09-12",
      entryTime: "14:05",
    });
    expect(resolveWhen({ mode: "earlier", time: "12:40" }, now, "2026-09-12")).toEqual({
      entryDate: "2026-09-12",
      entryTime: "12:40",
    });
  });

  it("makes 'the day before' relative to the viewed day, not to today", () => {
    expect(resolveWhen({ mode: "yesterday", time: "19:00" }, now, "2026-09-12")).toEqual({
      entryDate: "2026-09-11",
      entryTime: "19:00",
    });
  });

  it("treats today as the ordinary case even when passed explicitly", () => {
    expect(resolveWhen({ mode: "now", time: "" }, now, "2026-09-16")).toEqual({
      entryDate: "2026-09-16",
      entryTime: "14:05",
    });
  });
});
