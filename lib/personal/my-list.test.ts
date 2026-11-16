import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/cache/insights", () => ({ invalidateUserInsights: vi.fn() }));

import { groupFoods } from "./my-list";
import type { PersonalRating } from "@/lib/protocols/fit-line";

const items = [
  { foodId: "egg", name: "Eggs", category: "Eggs", status: "avoid", reasons: ["Eggs not allowed"] },
  { foodId: "tom", name: "Tomato", category: "Vegetables", status: "avoid", reasons: ["Nightshade not allowed"] },
  { foodId: "car", name: "Carrot", category: "Vegetables", status: "allowed", reasons: [] },
  { foodId: "gar", name: "Garlic", category: "Vegetables", status: "allowed", reasons: [] },
];

describe("groupFoods", () => {
  it("sorts by diet, with the person's own rating winning", () => {
    const personal = new Map<string, PersonalRating>([
      ["egg", { status: "safe", source: "trial" }],
      ["gar", { status: "unsafe", source: "self" }],
    ]);
    const g = groupFoods(items, "AIP", personal);
    expect(g.allowed.map((i) => i.name)).toEqual(["Carrot", "Eggs"]);
    expect(g.allowed.find((i) => i.name === "Eggs")?.reason).toBe("passed reintroduction");
    expect(g.avoid.map((i) => [i.name, i.reason])).toEqual([
      ["Garlic", "your rating"],
      ["Tomato", "nightshade"],
    ]);
  });

  it("lists only the person's own ratings when they have no diet", () => {
    const personal = new Map<string, PersonalRating>([["gar", { status: "sensitive", source: "self" }]]);
    const g = groupFoods(items.map((i) => ({ ...i, status: null, reasons: [] })), null, personal);
    expect(g.limit.map((i) => i.name)).toEqual(["Garlic"]);
    expect(g.allowed).toEqual([]);
    expect(g.avoid).toEqual([]);
  });
});
