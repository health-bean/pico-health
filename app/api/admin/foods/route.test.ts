import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const foodId = "33333333-3333-4333-8333-333333333333";

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

function mockUpdate() {
  const setMock = vi.fn(() => ({
    where: vi.fn(async () => undefined),
  }));
  vi.mocked(db.update).mockReturnValue({ set: setMock } as unknown as ReturnType<typeof db.update>);
  return setMock;
}

function mockInsert() {
  const valuesMock = vi.fn(async () => undefined);
  vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as unknown as ReturnType<typeof db.insert>);
  return valuesMock;
}

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/foods", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/foods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("admin-1", true);
  });

  it("returns 403 for non-admins", async () => {
    mockSession("user-1", false);
    const res = await GET(new Request("http://localhost/api/admin/foods"));
    expect(res.status).toBe(403);
  });

  it("selects provenance fields (sources, reviewStatus, reviewedBy)", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));

    const res = await GET(new Request("http://localhost/api/admin/foods"));
    expect(res.status).toBe(200);

    const projection = vi.mocked(db.select).mock.calls[0][0] as Record<string, unknown>;
    expect(projection).toHaveProperty("sources");
    expect(projection).toHaveProperty("reviewStatus");
    expect(projection).toHaveProperty("reviewedBy");
  });
});

describe("PATCH /api/admin/foods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("admin-1", true);
  });

  it("rejects an invalid property", async () => {
    const res = await PATCH(patchReq({ foodId, property: "sugar", value: "high" }));
    expect(res.status).toBe(400);
  });

  it("manual console edit sets founder_set with the default source and merges sources", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      chain([{ id: "tp-1", sources: { oxalate: { source: "Harvard oxalate list" } } }])
    );
    const setMock = mockUpdate();

    const res = await PATCH(patchReq({ foodId, property: "histamine", value: "high" }));
    expect(res.status).toBe(200);

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        histamine: "high",
        reviewStatus: "founder_set",
        updatedAt: expect.any(Date),
        sources: {
          oxalate: { source: "Harvard oxalate list" },
          histamine: { source: "Founder/manual", ref: "admin console edit" },
        },
      })
    );
  });

  it("uses an explicit source when provided, still founder_set", async () => {
    vi.mocked(db.select).mockReturnValueOnce(chain([{ id: "tp-1", sources: null }]));
    const setMock = mockUpdate();

    const res = await PATCH(
      patchReq({
        foodId,
        property: "fodmap",
        value: "high",
        sources: { fodmap: { source: "Monash FODMAP app", ref: "2026 edition" } },
      })
    );
    expect(res.status).toBe(200);

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewStatus: "founder_set",
        sources: { fodmap: { source: "Monash FODMAP app", ref: "2026 edition" } },
      })
    );
  });

  it("inserts a new row with founder_set and the default source when none exists", async () => {
    vi.mocked(db.select).mockReturnValueOnce(chain([]));
    const valuesMock = mockInsert();

    const res = await PATCH(patchReq({ foodId, property: "nightshade", value: true }));
    expect(res.status).toBe(200);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        foodId,
        nightshade: true,
        reviewStatus: "founder_set",
        sources: { nightshade: { source: "Founder/manual", ref: "admin console edit" } },
      })
    );
  });
});
