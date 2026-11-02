import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import { PATCH } from "./[id]/route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const sourceId = "44444444-4444-4444-8444-444444444444";

function mockSession(userId: string | null, isAdmin = false) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId,
    isAdmin,
    email: "admin@example.com",
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

function mockSelect(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["from", "orderBy"]) c[m] = vi.fn(() => c);
  c.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(ok, bad);
  vi.mocked(db.select).mockReturnValue(c as never);
}

function mockInsert(result: unknown[] | Error) {
  const values = vi.fn(() => ({
    returning: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  }));
  vi.mocked(db.insert).mockReturnValue({ values } as unknown as ReturnType<typeof db.insert>);
  return values;
}

function mockUpdate(result: unknown[]) {
  const set = vi.fn(() => ({
    where: vi.fn(() => ({ returning: vi.fn(async () => result) })),
  }));
  vi.mocked(db.update).mockReturnValue({ set } as unknown as ReturnType<typeof db.update>);
  return set;
}

function req(method: string, body: unknown) {
  return new Request("http://localhost/api/admin/sources", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const valid = {
  name: "PubMed",
  url: "https://pubmed.ncbi.nlm.nih.gov",
  trustedFor: ["histamine", "lectin"],
  useAs: "data",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession("admin-1", true);
});

describe("GET /api/admin/sources", () => {
  it("returns 401 when signed out and 403 for non-admins", async () => {
    mockSession(null);
    expect((await GET()).status).toBe(401);
    mockSession("user-1", false);
    expect((await GET()).status).toBe(403);
  });

  it("lists sources for admins", async () => {
    mockSelect([{ id: sourceId, name: "PubMed" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).sources).toHaveLength(1);
  });
});

describe("POST /api/admin/sources", () => {
  it("rejects non-admins before touching the database", async () => {
    mockSession("user-1", false);
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(403);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates a source and records who added it", async () => {
    const values = mockInsert([{ id: sourceId, ...valid }]);
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "PubMed",
        trustedFor: ["histamine", "lectin"],
        isActive: true,
        notes: null,
        createdBy: "admin@example.com",
      })
    );
  });

  it("requires an https web address", async () => {
    for (const url of ["http://example.com", "example.com", "javascript:alert(1)"]) {
      const res = await POST(req("POST", { ...valid, url }));
      expect(res.status).toBe(400);
    }
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects unknown properties and empty names", async () => {
    expect((await POST(req("POST", { ...valid, trustedFor: ["leptin"] }))).status).toBe(400);
    expect((await POST(req("POST", { ...valid, name: "   " }))).status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    expect((await POST(req("POST", "{not json"))).status).toBe(400);
  });

  it("returns 409 for a duplicate name", async () => {
    mockInsert(Object.assign(new Error("dup"), { cause: { code: "23505" } }));
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/admin/sources/:id", () => {
  it("rejects non-admins", async () => {
    mockSession("user-1", false);
    const res = await PATCH(req("PATCH", { isActive: false }), params(sourceId));
    expect(res.status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("turns a source off", async () => {
    const set = mockUpdate([{ id: sourceId, isActive: false }]);
    const res = await PATCH(req("PATCH", { isActive: false }), params(sourceId));
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it("returns 404 for a bad or missing id", async () => {
    expect((await PATCH(req("PATCH", { isActive: false }), params("nope"))).status).toBe(404);
    mockUpdate([]);
    expect((await PATCH(req("PATCH", { isActive: false }), params(sourceId))).status).toBe(404);
  });

  it("rejects an empty update", async () => {
    expect((await PATCH(req("PATCH", {}), params(sourceId))).status).toBe(400);
  });
});
