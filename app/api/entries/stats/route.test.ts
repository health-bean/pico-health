import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const userId = "11111111-1111-4111-8111-111111111111";

/** Chain for the aggregate query: select().from().where() → rows */
function aggregateChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(rows)),
    })),
  } as unknown as ReturnType<typeof db.select>;
}

/** Chain for the profile query: select().from().where().limit() → rows */
function profileChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>;
}

describe("GET /api/entries/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns days tracked, first entry date, and the tracking goal", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        aggregateChain([{ daysTracked: 12, firstEntryDate: "2026-08-20" }])
      )
      .mockReturnValueOnce(
        profileChain([
          { trackingGoalDays: 30, trackingGoalStartDate: "2026-08-25" },
        ])
      );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      daysTracked: 12,
      firstEntryDate: "2026-08-20",
      trackingGoalDays: 30,
      trackingGoalStartDate: "2026-08-25",
    });
  });

  it("returns zero-state values for a brand new user", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        aggregateChain([{ daysTracked: 0, firstEntryDate: null }])
      )
      .mockReturnValueOnce(profileChain([]));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      daysTracked: 0,
      firstEntryDate: null,
      trackingGoalDays: null,
      trackingGoalStartDate: null,
    });
  });
});
