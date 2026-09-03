import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { handleUpdateFoodTriggers, handleAddFood } from "./food";
import type { UpdateFoodTriggersInput, AddFoodInput } from "./types";

vi.mock("@/lib/db");

function selectChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => rows),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>;
}

function mockUpdate() {
  const setMock = vi.fn(() => ({
    where: vi.fn(async () => undefined),
  }));
  vi.mocked(db.update).mockReturnValue({ set: setMock } as unknown as ReturnType<typeof db.update>);
  return setMock;
}

const food = { id: "f-1", displayName: "Spinach" };

describe("handleUpdateFoodTriggers provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects updates lacking citations for the properties being set", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([food]))
      .mockReturnValueOnce(selectChain([{ id: "tp-1", foodId: "f-1", sources: null, reviewStatus: "unreviewed" }]));

    const result = (await handleUpdateFoodTriggers({
      food_name: "Spinach",
      updates: { histamine: "high", oxalate: "very_high" },
      sources: { histamine: { source: "SIGHI" } },
    } as UpdateFoodTriggersInput)) as { error?: string };

    expect(result.error).toContain("oxalate");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects when sources are missing entirely", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([food]))
      .mockReturnValueOnce(selectChain([]));

    const result = (await handleUpdateFoodTriggers({
      food_name: "Spinach",
      updates: { histamine: "high" },
    } as UpdateFoodTriggersInput)) as { error?: string };

    expect(result.error).toBeDefined();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("a 'default' citation covers all properties; merges sources and sets ai_proposed", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([food]))
      .mockReturnValueOnce(
        selectChain([
          {
            id: "tp-1",
            foodId: "f-1",
            oxalate: "low",
            histamine: "low",
            sources: { fodmap: { source: "Monash" } },
            reviewStatus: "founder_set",
          },
        ])
      );
    const setMock = mockUpdate();

    const result = (await handleUpdateFoodTriggers({
      food_name: "Spinach",
      updates: { histamine: "high", oxalate: "very_high" },
      sources: { default: { source: "SIGHI", ref: "list 2024" } },
    } as UpdateFoodTriggersInput)) as { success?: boolean };

    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        histamine: "high",
        oxalate: "very_high",
        reviewStatus: "ai_proposed",
        updatedAt: expect.any(Date),
        sources: {
          fodmap: { source: "Monash" },
          histamine: { source: "SIGHI", ref: "list 2024" },
          oxalate: { source: "SIGHI", ref: "list 2024" },
        },
      })
    );
  });

  it("downgrades a practitioner_reviewed row to ai_proposed on edit", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([food]))
      .mockReturnValueOnce(
        selectChain([{ id: "tp-1", foodId: "f-1", histamine: "low", sources: {}, reviewStatus: "practitioner_reviewed" }])
      );
    const setMock = mockUpdate();

    await handleUpdateFoodTriggers({
      food_name: "Spinach",
      updates: { histamine: "high" },
      sources: { histamine: { source: "SIGHI" } },
    } as UpdateFoodTriggersInput);

    const setArg = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.reviewStatus).toBe("ai_proposed");
  });

  it("inserts with ai_proposed when no property row exists", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([food]))
      .mockReturnValueOnce(selectChain([]));
    const valuesMock = vi.fn(async () => undefined);
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as unknown as ReturnType<typeof db.insert>);

    await handleUpdateFoodTriggers({
      food_name: "Spinach",
      updates: { histamine: "high" },
      sources: { histamine: { source: "SIGHI" } },
    } as UpdateFoodTriggersInput);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        foodId: "f-1",
        histamine: "high",
        reviewStatus: "ai_proposed",
        sources: { histamine: { source: "SIGHI" } },
      })
    );
  });
});

describe("handleAddFood provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseInput = {
    name: "Grass-fed Butter",
    subcategory: "Dairy",
    is_common: true,
    triggers: { histamine: "moderate", fodmap: "low" },
  };

  it("rejects when citations are missing for set trigger properties", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([{ id: 7, categoryId: 1 }]))
      .mockReturnValueOnce(selectChain([]));

    const result = (await handleAddFood({
      ...baseInput,
      sources: { histamine: { source: "SIGHI" } },
    } as AddFoodInput)) as { error?: string };

    expect(result.error).toContain("fodmap");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts trigger properties with per-property sources and ai_proposed", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([{ id: 7, categoryId: 1 }]))
      .mockReturnValueOnce(selectChain([]));

    const triggerValuesMock = vi.fn(async () => undefined);
    vi.mocked(db.insert)
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: "f-9", displayName: "Grass-fed Butter" }]),
        })),
      } as unknown as ReturnType<typeof db.insert>)
      .mockReturnValueOnce({ values: triggerValuesMock } as unknown as ReturnType<typeof db.insert>);

    const result = (await handleAddFood({
      ...baseInput,
      sources: {
        histamine: { source: "SIGHI", ref: "0-3 scale" },
        default: { source: "Monash FODMAP" },
      },
    } as AddFoodInput)) as { success?: boolean };

    expect(result.success).toBe(true);
    expect(triggerValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        foodId: "f-9",
        reviewStatus: "ai_proposed",
        sources: {
          histamine: { source: "SIGHI", ref: "0-3 scale" },
          fodmap: { source: "Monash FODMAP" },
        },
      })
    );
  });
});
