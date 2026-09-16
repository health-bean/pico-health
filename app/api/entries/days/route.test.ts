import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const userId = "11111111-1111-4111-8111-111111111111";

/** select().from().where().groupBy() → rows */
function groupChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        groupBy: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>;
}

const req = (qs: string) => new NextRequest(`http://localhost/api/entries/days?${qs}`);

describe("GET /api/entries/days", () => {
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
    const res = await GET(req("from=2026-09-10&to=2026-09-16"));
    expect(res.status).toBe(401);
  });

  it("rejects a malformed or oversized range", async () => {
    expect((await GET(req("from=nope&to=2026-09-16"))).status).toBe(400);
    expect((await GET(req("from=2026-01-01&to=2026-09-16"))).status).toBe(400);
    expect((await GET(req("from=2026-09-16&to=2026-09-10"))).status).toBe(400);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns entry counts keyed by day", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      groupChain([
        { entryDate: "2026-09-12", count: 4 },
        { entryDate: "2026-09-15", count: 1 },
      ])
    );
    const res = await GET(req("from=2026-09-10&to=2026-09-16"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      days: { "2026-09-12": 4, "2026-09-15": 1 },
    });
  });
});
