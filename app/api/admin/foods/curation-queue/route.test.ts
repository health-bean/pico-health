import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

function mockSession(userId: string | null, isAdmin = false) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId,
    isAdmin,
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

function chain(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "leftJoin", "innerJoin", "where", "groupBy", "orderBy", "limit", "$dynamic"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(onFulfilled, onRejected);
  return c as never;
}

describe("GET /api/admin/foods/curation-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("admin-1", true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockSession("user-1", false);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("assembles missing properties, unmatched names, and unreviewed counts", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        chain([
          { foodId: "f1", displayName: "Spinach", source: "usda", logCount: 12 },
          { foodId: "f2", displayName: "Kale", source: "curated", logCount: 0 },
        ])
      )
      .mockReturnValueOnce(chain([{ name: "grass-fed butter", logCount: 5 }]))
      .mockReturnValueOnce(chain([{ status: "founder_set", count: 99 }]));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.missingProperties).toEqual([
      { foodId: "f1", displayName: "Spinach", source: "usda", logCount: 12 },
      { foodId: "f2", displayName: "Kale", source: "curated", logCount: 0 },
    ]);
    expect(data.unmatchedNames).toEqual([{ name: "grass-fed butter", logCount: 5 }]);
    expect(data.unreviewed).toEqual({ founder_set: 99, ai_proposed: 0, unreviewed: 0 });
  });
});
