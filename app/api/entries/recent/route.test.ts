import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");
vi.mock("@/lib/logger", () => ({ log: { error: vi.fn() } }));

const userId = "11111111-1111-4111-8111-111111111111";

/** select().from().where().groupBy().orderBy().limit() → rows */
function chain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(rows)) })),
        })),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>;
}

const req = (qs: string) => new Request(`http://localhost/api/entries/recent?${qs}`);

describe("GET /api/entries/recent", () => {
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
    expect((await GET(req("days=7"))).status).toBe(401);
  });

  it("returns the recent window when it has items", async () => {
    vi.mocked(db.select).mockReturnValueOnce(chain([{ entryType: "food", name: "Salmon", count: 3 }]));
    const res = await GET(req("days=7&fallback=1"));
    expect(await res.json()).toMatchObject({ window: "recent", items: [{ name: "Salmon" }] });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("falls back to all-time favourites when the window is empty and fallback is on", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([{ entryType: "symptom", name: "Joint Pain", count: 40 }]));
    const res = await GET(req("days=7&fallback=1"));
    expect(await res.json()).toMatchObject({ window: "all", items: [{ name: "Joint Pain" }] });
  });

  it("stays empty without fallback", async () => {
    vi.mocked(db.select).mockReturnValueOnce(chain([]));
    const res = await GET(req("days=7"));
    expect(await res.json()).toEqual({ items: [], window: "recent" });
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});
