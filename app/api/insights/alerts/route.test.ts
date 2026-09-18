import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const userId = "11111111-1111-4111-8111-111111111111";

/** select().from().where().orderBy().limit() → rows */
function listChain(rows: unknown[]) {
  const limit = vi.fn(() => Promise.resolve(rows));
  const orderBy = vi.fn(() => ({ limit }));
  const chain = {
    from: vi.fn(() => ({
      where: vi.fn(() => ({ orderBy })),
    })),
  } as unknown as ReturnType<typeof db.select>;
  return { chain, orderBy, limit };
}

/** update().set().where() → result */
function updateChain() {
  const where = vi.fn(() => Promise.resolve([]));
  const set = vi.fn(() => ({ where }));
  return { chain: { set } as unknown as ReturnType<typeof db.update>, set, where };
}

describe("GET /api/insights/alerts", () => {
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

  it("shows one card per pattern, keeping the most recent", async () => {
    const rows = [
      { id: "a", insightKey: "progress:headache", createdAt: "2026-09-15T00:00:00Z" },
      { id: "b", insightKey: "progress:headache", createdAt: "2026-09-08T00:00:00Z" },
      { id: "c", insightKey: "food:eggs→symptom:headache", createdAt: "2026-09-07T00:00:00Z" },
    ];
    const { chain } = listChain(rows);
    vi.mocked(db.select).mockReturnValueOnce(chain);

    const res = await GET();
    expect(await res.json()).toEqual([rows[0], rows[2]]);
  });

  it("returns a bounded, newest-first list of recent alerts", async () => {
    const rows = [{ id: "a", insightKey: "food:eggs→symptom:headache", createdAt: "2026-09-15T00:00:00Z" }];
    const { chain, orderBy, limit } = listChain(rows);
    vi.mocked(db.select).mockReturnValueOnce(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(80);
  });
});

describe("PATCH /api/insights/alerts", () => {
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

    const res = await PATCH();
    expect(res.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("dismisses every open alert for the signed-in user", async () => {
    const { chain, set, where } = updateChain();
    vi.mocked(db.update).mockReturnValueOnce(chain);

    const res = await PATCH();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ dismissed: true, dismissedAt: expect.any(Date) })
    );
    expect(where).toHaveBeenCalledTimes(1);
  });
});
