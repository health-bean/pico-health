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

function req(query = "") {
  return new Request(`http://localhost/api/admin/usage${query}`);
}

const zeroSums = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
};

function mockQueries(
  taskModelRows: unknown[],
  userModelRows: unknown[] = [],
  dayModelRows: unknown[] = []
) {
  vi.mocked(db.select)
    .mockReturnValueOnce(chain(taskModelRows))
    .mockReturnValueOnce(chain(userModelRows))
    .mockReturnValueOnce(chain(dayModelRows));
}

describe("GET /api/admin/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("admin-1", true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockSession("user-1", false);
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it("rejects an invalid days value", async () => {
    const res = await GET(req("?days=14"));
    expect(res.status).toBe(400);
  });

  it("accepts days=7|30|90 and defaults to 30", async () => {
    for (const query of ["", "?days=7", "?days=30", "?days=90"]) {
      vi.mocked(db.select).mockReset();
      mockQueries([], [], []);
      const res = await GET(req(query));
      expect(res.status, query).toBe(200);
    }
  });

  it("returns empty aggregates when there is no usage", async () => {
    mockQueries([], [], []);
    const res = await GET(req());
    const data = await res.json();
    expect(data.totals).toEqual({
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      estCostUsd: 0,
      unknownModelRequests: 0,
    });
    expect(data.byTask).toEqual([]);
    expect(data.byUser).toEqual([]);
    expect(data.byDay).toEqual([]);
  });

  it("aggregates totals and per-task costs from (task, model) groups", async () => {
    mockQueries(
      [
        {
          task: "chat",
          model: "claude-sonnet-5",
          requests: 10,
          inputTokens: 1_000_000,
          outputTokens: 100_000,
          cacheReadInputTokens: 500_000,
          cacheCreationInputTokens: 0,
        },
        {
          task: "capture",
          model: "claude-haiku-4-5",
          requests: 40,
          inputTokens: 2_000_000,
          outputTokens: 200_000,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 400_000,
        },
      ],
      [],
      []
    );
    const res = await GET(req());
    const data = await res.json();

    // sonnet: 1*2 + 0.1*10 + 0.5*2*0.1 = 3.1; haiku: 2*1 + 0.2*5 + 0.4*1*1.25 = 3.5
    expect(data.totals.requests).toBe(50);
    expect(data.totals.inputTokens).toBe(3_000_000);
    expect(data.totals.outputTokens).toBe(300_000);
    expect(data.totals.cacheReadInputTokens).toBe(500_000);
    expect(data.totals.cacheCreationInputTokens).toBe(400_000);
    expect(data.totals.estCostUsd).toBeCloseTo(6.6, 8);
    expect(data.totals.unknownModelRequests).toBe(0);

    // sorted by cost, descending
    expect(data.byTask.map((r: { task: string }) => r.task)).toEqual(["capture", "chat"]);
    expect(data.byTask[1].estCostUsd).toBeCloseTo(3.1, 8);
  });

  it("surfaces unknown models with null cost, excluded from totals", async () => {
    mockQueries(
      [
        {
          task: "chat",
          model: "mystery-model-9",
          requests: 3,
          inputTokens: 5_000_000,
          outputTokens: 1_000_000,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        {
          task: "chat",
          model: "claude-haiku-4-5",
          requests: 2,
          ...zeroSums,
          inputTokens: 1_000_000,
        },
      ],
      [],
      []
    );
    const res = await GET(req());
    const data = await res.json();

    expect(data.totals.unknownModelRequests).toBe(3);
    expect(data.totals.estCostUsd).toBeCloseTo(1, 8);
    const unknown = data.byTask.find((r: { model: string }) => r.model === "mystery-model-9");
    expect(unknown.estCostUsd).toBeNull();
    // unknown-cost rows sort after priced rows
    expect(data.byTask[data.byTask.length - 1].model).toBe("mystery-model-9");
  });

  it("rolls up cost per user across models and sorts by cost", async () => {
    mockQueries(
      [],
      [
        { userId: "u1", email: "a@x.io", model: "claude-sonnet-5", requests: 5, ...zeroSums, inputTokens: 1_000_000 },
        { userId: "u1", email: "a@x.io", model: "claude-haiku-4-5", requests: 3, ...zeroSums, inputTokens: 1_000_000 },
        { userId: "u2", email: "b@x.io", model: "claude-opus-5", requests: 1, ...zeroSums, inputTokens: 1_000_000 },
      ],
      []
    );
    const res = await GET(req());
    const data = await res.json();

    expect(data.byUser).toHaveLength(2);
    expect(data.byUser[0]).toMatchObject({ userId: "u2", email: "b@x.io", requests: 1 });
    expect(data.byUser[0].estCostUsd).toBeCloseTo(5, 8);
    expect(data.byUser[1]).toMatchObject({ userId: "u1", email: "a@x.io", requests: 8 });
    expect(data.byUser[1].estCostUsd).toBeCloseTo(3, 8);
  });

  it("caps byUser at 25 rows", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      userId: `u${i}`,
      email: `u${i}@x.io`,
      model: "claude-haiku-4-5",
      requests: 1,
      ...zeroSums,
      inputTokens: (i + 1) * 1000,
    }));
    mockQueries([], rows, []);
    const res = await GET(req());
    const data = await res.json();
    expect(data.byUser).toHaveLength(25);
    expect(data.byUser[0].userId).toBe("u29"); // highest cost first
  });

  it("rolls up daily cost across models, ascending by date", async () => {
    mockQueries(
      [],
      [],
      [
        { date: "2026-09-02", model: "claude-haiku-4-5", requests: 4, ...zeroSums, inputTokens: 1_000_000 },
        { date: "2026-09-01", model: "claude-sonnet-5", requests: 2, ...zeroSums, inputTokens: 1_000_000 },
        { date: "2026-09-01", model: "claude-haiku-4-5", requests: 1, ...zeroSums, inputTokens: 2_000_000 },
      ]
    );
    const res = await GET(req());
    const data = await res.json();

    expect(data.byDay).toHaveLength(2);
    expect(data.byDay[0].date).toBe("2026-09-01");
    expect(data.byDay[0].requests).toBe(3);
    expect(data.byDay[0].estCostUsd).toBeCloseTo(4, 8);
    expect(data.byDay[1]).toMatchObject({ date: "2026-09-02", requests: 4 });
  });
});
