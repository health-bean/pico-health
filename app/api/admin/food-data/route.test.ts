import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as addMeasurement } from "./[foodId]/measurements/route";
import { PATCH as editMeasurement } from "./measurements/[id]/route";
import { POST as review } from "./[foodId]/review/route";
import { PATCH as setServing } from "./[foodId]/route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";
import { recomputeFoodProperty } from "@/lib/food-data/sync";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");
vi.mock("@/lib/food-data/sync", () => ({
  recomputeFoodProperty: vi.fn(async () => ({ result: { level: "high" }, rows: [] })),
  loadMeasurements: vi.fn(async () => []),
}));

const foodId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";
const measurementId = "33333333-3333-4333-8333-333333333333";

function session(isAdmin: boolean) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId: "u1",
    isAdmin,
    email: "admin@example.com",
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

/** Queue the results of successive db.select() calls. */
function selects(...results: unknown[][]) {
  const mock = vi.mocked(db.select);
  for (const rows of results) {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "where", "limit", "innerJoin", "leftJoin"]) c[k] = vi.fn(() => c);
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve(rows).then(ok);
    mock.mockReturnValueOnce(c as never);
  }
}

function insertReturning(row: unknown) {
  const values = vi.fn(() => ({
    returning: vi.fn(async () => [row]),
    onConflictDoUpdate: vi.fn(async () => undefined),
  }));
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return values;
}

function updateReturning(row: unknown) {
  const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => (row ? [row] : [])) })) }));
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return set;
}

const req = (body: unknown) =>
  new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
const p = <T extends object>(v: T) => ({ params: Promise.resolve(v) });

const valid = {
  property: "oxalate",
  valuePer100g: 410,
  sourceId,
  citation: "Siener R, et al. Oxalate content of nuts. 2006.",
  citationUrl: "https://doi.org/10.1021/jf052776v",
  studyYear: 2006,
};

beforeEach(() => {
  vi.clearAllMocks();
  session(true);
});

describe("POST measurements", () => {
  it("is admin only", async () => {
    session(false);
    const res = await addMeasurement(req(valid), p({ foodId }));
    expect(res.status).toBe(403);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("adds a result from a data source and re-rates the food", async () => {
    selects([{ id: foodId }], [{ isActive: true, useAs: "data" }]);
    const values = insertReturning({ id: measurementId });
    const res = await addMeasurement(req(valid), p({ foodId }));
    expect(res.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ foodId, property: "oxalate", valuePer100g: 410, createdBy: "admin@example.com" })
    );
    expect(recomputeFoodProperty).toHaveBeenCalledWith(foodId, "oxalate");
  });

  it("accepts a permission-pending source (stored for comparison only)", async () => {
    selects([{ id: foodId }], [{ isActive: true, useAs: "check" }]);
    expect((await addMeasurement(req(valid), p({ foodId }))).status).toBe(201);
  });

  it("rejects reference-only or turned-off sources", async () => {
    selects([{ id: foodId }], [{ isActive: true, useAs: "reference" }]);
    expect((await addMeasurement(req(valid), p({ foodId }))).status).toBe(400);
    selects([{ id: foodId }], [{ isActive: false, useAs: "data" }]);
    expect((await addMeasurement(req(valid), p({ foodId }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("needs an amount or a level, and a citation", async () => {
    expect((await addMeasurement(req({ ...valid, valuePer100g: null }), p({ foodId }))).status).toBe(400);
    expect((await addMeasurement(req({ ...valid, citation: "" }), p({ foodId }))).status).toBe(400);
  });

  it("doesn't take nightshade (a botanical yes/no, not a measurement)", async () => {
    expect((await addMeasurement(req({ ...valid, property: "nightshade" }), p({ foodId }))).status).toBe(400);
  });

  it("rejects non-https links", async () => {
    expect((await addMeasurement(req({ ...valid, citationUrl: "javascript:alert(1)" }), p({ foodId }))).status).toBe(400);
  });
});

describe("PATCH measurement", () => {
  it("excluding needs a reason", async () => {
    const res = await editMeasurement(req({ excluded: true }), p({ id: measurementId }));
    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("excludes with a reason and re-rates", async () => {
    selects([{ foodId, property: "oxalate" }]);
    const set = updateReturning({ id: measurementId, property: "oxalate" });
    const res = await editMeasurement(
      req({ excluded: true, exclusionNote: "Pigeon peas, not green peas" }),
      p({ id: measurementId })
    );
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ excluded: true, exclusionNote: "Pigeon peas, not green peas" }));
    expect(recomputeFoodProperty).toHaveBeenCalledWith(foodId, "oxalate");
  });

  it("including again clears the old reason", async () => {
    selects([{ foodId, property: "oxalate" }]);
    const set = updateReturning({ id: measurementId, property: "oxalate" });
    await editMeasurement(req({ excluded: false }), p({ id: measurementId }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ excluded: false, exclusionNote: null }));
  });

  it("404s for an unknown result", async () => {
    selects([]);
    expect((await editMeasurement(req({ excluded: false }), p({ id: measurementId }))).status).toBe(404);
  });
});

describe("review and serving size", () => {
  it("records the sign-off and re-rates", async () => {
    const values = insertReturning(null);
    const res = await review(req({ property: "oxalate", note: "Kept the median" }), p({ foodId }));
    expect(res.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ foodId, property: "oxalate", reviewedBy: "admin@example.com" }));
    expect(recomputeFoodProperty).toHaveBeenCalledWith(foodId, "oxalate");
  });

  it("setting a serving size re-rates every measured property", async () => {
    updateReturning({ id: foodId });
    const distinct = { from: vi.fn(() => ({ where: vi.fn(async () => [{ property: "oxalate" }, { property: "histamine" }]) })) };
    vi.mocked(db.selectDistinct).mockReturnValue(distinct as never);
    const res = await setServing(
      new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify({ servingGrams: 28, servingLabel: "1 oz" }) }),
      p({ foodId })
    );
    expect(res.status).toBe(200);
    expect(recomputeFoodProperty).toHaveBeenCalledTimes(2);
  });
});
