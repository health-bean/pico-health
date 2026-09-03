import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { scoreFixture } from "./capture-score";
import type { Fixture, ActualEntry } from "./capture-score";

const fixtures: Fixture[] = JSON.parse(
  readFileSync(path.join(process.cwd(), "evals/capture/fixtures.json"), "utf8")
);

/**
 * Guards the fixture file itself. A fixture that can't score perfect against its
 * own stated expectation is malformed — it would fail every model forever and
 * quietly drag the headline number down.
 */
describe("capture eval fixtures", () => {
  it("has fixtures with unique ids", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
  });

  it("every fixture has an input, a category, and an expect block", () => {
    for (const f of fixtures) {
      expect(f.input, f.id).toBeTruthy();
      expect(f.category, f.id).toBeTruthy();
      expect(Array.isArray(f.expect?.entries), f.id).toBe(true);
    }
  });

  it("every fixture scores perfect against its own ideal output", () => {
    const notSelfConsistent: string[] = [];
    for (const f of fixtures) {
      const ideal: ActualEntry[] = f.expect.entries.map((e) => ({
        entryType: e.entryType,
        name: e.name,
        severity: e.severity ?? null,
        mealType: e.entryType === "food" ? (f.expect.mealType ?? null) : null,
        preparation: e.preparation ?? [],
      }));
      if (!scoreFixture(f, ideal).perfect) notSelfConsistent.push(f.id);
    }
    expect(notSelfConsistent).toEqual([]);
  });

  it("forbidden names never collide with that fixture's own expected names", () => {
    const collisions: string[] = [];
    for (const f of fixtures) {
      for (const forbid of f.expect.forbidNames ?? []) {
        for (const exp of f.expect.entries) {
          if (exp.name.toLowerCase() === forbid.toLowerCase()) {
            collisions.push(`${f.id}: "${forbid}"`);
          }
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});
