import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const mockUserId = "11111111-1111-4111-8111-111111111111";
const mockFoodId = "22222222-2222-4222-8222-222222222222";

type InsertRows = Record<string, unknown>[];

function mockInsert() {
  const valuesMock = vi.fn((rows: InsertRows) => ({
    returning: vi.fn().mockResolvedValue(
      rows.map((r, i) => ({ id: `entry-${i}`, ...r }))
    ),
  }));
  vi.mocked(db.insert).mockReturnValue({
    values: valuesMock,
  } as unknown as ReturnType<typeof db.insert>);
  return valuesMock;
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/entries/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/entries/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: mockUserId,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    const res = await post({ entries: [] });
    expect(res.status).toBe(401);
  });

  it("persists foodId, mealType, entryDate and entryTime for food entries", async () => {
    const valuesMock = mockInsert();

    const res = await post({
      entries: [
        {
          entryType: "food",
          name: "Salmon",
          foodId: mockFoodId,
          mealType: "dinner",
          entryDate: "2026-08-31",
          entryTime: "18:30",
          timezone: "America/Los_Angeles",
        },
      ],
    });

    expect(res.status).toBe(201);
    expect(valuesMock).toHaveBeenCalledTimes(1);
    const rows = valuesMock.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: mockUserId,
      entryType: "food",
      name: "Salmon",
      foodId: mockFoodId,
      mealType: "dinner",
      entryDate: "2026-08-31",
      entryTime: "18:30",
      timezone: "America/Los_Angeles",
    });

    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.entries[0].foodId).toBe(mockFoodId);
  });

  it("stores null foodId/mealType for symptom entries and keeps severity", async () => {
    const valuesMock = mockInsert();

    const res = await post({
      entries: [
        {
          entryType: "symptom",
          name: "Headache",
          severity: 5,
          entryDate: "2026-08-31",
          entryTime: "09:00",
        },
      ],
    });

    expect(res.status).toBe(201);
    const rows = valuesMock.mock.calls[0][0];
    expect(rows[0]).toMatchObject({
      entryType: "symptom",
      name: "Headache",
      severity: 5,
      foodId: null,
      mealType: null,
    });
  });

  it("rejects food fields on non-food entries", async () => {
    mockInsert();

    const res = await post({
      entries: [
        {
          entryType: "symptom",
          name: "Headache",
          foodId: mockFoodId,
          entryDate: "2026-08-31",
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects an invalid mealType", async () => {
    mockInsert();

    const res = await post({
      entries: [
        {
          entryType: "food",
          name: "Pizza",
          mealType: "midnight",
          entryDate: "2026-08-31",
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
