import { describe, it, expect, beforeEach, vi } from "vitest";
import { processToolCall, type CreatedEntry } from "./extract";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/protocols/compliance", () => ({
  checkFoodCompliance: vi.fn(async () => ({ status: "allowed", violations: [] })),
}));

const userId = "11111111-1111-4111-8111-111111111111";

/** Values passed to db.insert(...).values(...), in call order. */
let insertedValues: Array<Record<string, unknown>>;

beforeEach(() => {
  vi.clearAllMocks();
  insertedValues = [];

  // No food match: every select chain resolves to [].
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

  const insertChain = {
    values: vi.fn((v: Record<string, unknown>) => {
      insertedValues.push(v);
      return insertChain;
    }),
    returning: vi.fn(async () => {
      const v = insertedValues[insertedValues.length - 1];
      return [{
        id: `entry-${insertedValues.length}`,
        entryType: v.entryType,
        name: v.name,
        severity: v.severity ?? null,
        entryDate: v.entryDate,
        entryTime: v.entryTime ?? null,
        mealType: v.mealType ?? null,
      }];
    }),
  };
  vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);
});

async function logEntries(entries: Array<Record<string, unknown>>): Promise<CreatedEntry[]> {
  const { entries: created } = await processToolCall("log_entries", { entries }, userId, null);
  return created!;
}

describe("log_entries preparation handling", () => {
  it("stores preparation in structuredContent and returns it on the created entry", async () => {
    const created = await logEntries([
      { entry_type: "food", name: "Last night's chicken", meal_type: "dinner", preparation: ["leftover"] },
    ]);

    expect(insertedValues[0].structuredContent).toEqual({ preparation: ["leftover"] });
    expect(created[0].preparation).toEqual(["leftover"]);
  });

  it("keeps preparation alongside other structured content", async () => {
    await logEntries([
      { entry_type: "food", name: "Sauerkraut", details: "small serving", preparation: ["fermented"] },
    ]);

    expect(insertedValues[0].structuredContent).toEqual({
      details: "small serving",
      preparation: ["fermented"],
    });
  });

  it("returns an empty preparation array when none is given", async () => {
    const created = await logEntries([
      { entry_type: "food", name: "Apple" },
    ]);

    expect(insertedValues[0].structuredContent).toBeNull();
    expect(created[0].preparation).toEqual([]);
  });

  it("ignores preparation on non-food entries", async () => {
    const created = await logEntries([
      { entry_type: "symptom", name: "Headache", severity: 5, preparation: ["leftover"] },
    ]);

    expect(insertedValues[0].structuredContent).toEqual({ severity: 5 });
    expect(created[0].preparation).toEqual([]);
  });

  it("filters non-string preparation values", async () => {
    const created = await logEntries([
      { entry_type: "food", name: "Stew", preparation: ["leftover", 42, null] },
    ]);

    expect(insertedValues[0].structuredContent).toEqual({ preparation: ["leftover"] });
    expect(created[0].preparation).toEqual(["leftover"]);
  });
});
