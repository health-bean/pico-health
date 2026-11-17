import { describe, expect, it } from "vitest";
import { chronological, groupMeals, notableProperties, propertyNoun, MEAL_WINDOW_MIN } from "./group-meals";

type E = { id: string; entryType: string; mealType?: string | null; entryTime: string | null };
const food = (id: string, entryTime: string | null, mealType: string | null = "lunch"): E => ({
  id,
  entryType: "food",
  mealType,
  entryTime,
});
const other = (id: string, entryType: string, entryTime: string | null): E => ({ id, entryType, entryTime });

describe("groupMeals", () => {
  it("puts foods from one meal in one group", () => {
    const out = groupMeals([food("a", "12:02:00"), food("b", "12:02:00"), food("c", "12:05:00")]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "meal", mealType: "lunch", time: "12:02:00" });
    if (out[0].kind === "meal") expect(out[0].entries.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the meal's earliest time when entries arrive newest first", () => {
    const out = groupMeals([food("c", "12:30:00"), food("b", "12:10:00"), food("a", "12:02:00")]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "meal", time: "12:02:00" });
  });

  it("splits different meals, and the same meal type far apart in time", () => {
    const out = groupMeals([
      food("d", "19:00:00", "dinner"),
      food("s2", "16:00:00", "snack"),
      food("s1", "10:00:00", "snack"),
    ]);
    expect(out.map((g) => (g.kind === "meal" ? g.entries.map((e) => e.id).join() : g.entry.id))).toEqual([
      "d",
      "s2",
      "s1",
    ]);
  });

  it(`joins foods up to ${MEAL_WINDOW_MIN} minutes apart, not beyond`, () => {
    expect(groupMeals([food("b", "13:00:00"), food("a", "12:00:00")])).toHaveLength(1);
    expect(groupMeals([food("b", "13:01:00"), food("a", "12:00:00")])).toHaveLength(2);
  });

  it("never merges across a symptom or other entry in between", () => {
    const out = groupMeals([food("b", "12:30:00"), other("s", "symptom", "12:20:00"), food("a", "12:00:00")]);
    expect(out.map((g) => g.kind)).toEqual(["meal", "entry", "meal"]);
  });

  it("groups foods without a time only with each other when the meal type matches", () => {
    const out = groupMeals([food("a", null, "breakfast"), food("b", null, "breakfast"), food("c", null, "lunch")]);
    expect(out).toHaveLength(2);
  });

  it("passes non-food entries through in order", () => {
    const out = groupMeals([other("x", "supplement", "08:00:00"), other("y", "exposure", null)]);
    expect(out).toEqual([
      { kind: "entry", entry: other("x", "supplement", "08:00:00") },
      { kind: "entry", entry: other("y", "exposure", null) },
    ]);
  });
});

describe("notableProperties", () => {
  it("shows moderate and above, strongest first", () => {
    const out = notableProperties({ histamine: "moderate", oxalate: "very_high", lectin: "low", fodmap: "high" });
    expect(out.map((p) => p.label)).toEqual(["Very high oxalate", "High FODMAP", "Moderate histamine"]);
  });

  it("names true booleans plainly and skips false ones", () => {
    expect(notableProperties({ nightshade: true, histamine: "none" }).map((p) => p.label)).toEqual(["Nightshade"]);
    expect(notableProperties({ nightshade: false })).toEqual([]);
  });

  it("ignores keys that are not trigger properties", () => {
    expect(notableProperties({ sources: "high", histamine: "unknown" })).toEqual([]);
  });

  it("returns nothing for missing properties", () => {
    expect(notableProperties(null)).toEqual([]);
    expect(notableProperties(undefined)).toEqual([]);
  });

  it("caps at the limit given", () => {
    const out = notableProperties({ histamine: "high", oxalate: "high", fodmap: "high", amines: "moderate" }, 2);
    expect(out).toHaveLength(2);
  });
});

describe("chronological", () => {
  it("reads morning to night, untimed entries last in their original order", () => {
    const out = chronological([
      { id: "dinner", entryTime: "18:54:00" },
      { id: "late", entryTime: null },
      { id: "bfast", entryTime: "08:02:00" },
      { id: "lunch", entryTime: "12:10:00" },
      { id: "late2", entryTime: null },
    ]);
    expect(out.map((e) => e.id)).toEqual(["bfast", "lunch", "dinner", "late", "late2"]);
  });

  it("puts the meal before a supplement logged at the same minute", () => {
    const out = chronological([other("d3", "supplement", "08:02:00"), food("oats", "08:02:00")]);
    expect(out.map((e) => e.id)).toEqual(["oats", "d3"]);
  });

  it("still groups a meal when its foods arrive oldest first", () => {
    const out = groupMeals(chronological([food("b", "12:20:00"), food("a", "12:10:00")]));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "meal", time: "12:10:00" });
  });
});

describe("propertyNoun", () => {
  it("matches the word a fit line uses", () => {
    expect(propertyNoun("histamine")).toBe("histamine");
    expect(propertyNoun("fodmap")).toBe("fodmap");
    expect(propertyNoun("some_new")).toBe("some new");
  });
});
