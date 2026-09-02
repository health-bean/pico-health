import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE, PATCH } from "./route";
import { getSessionFromCookies } from "@/lib/auth/session";
import { deleteEntry, updateEntry, getFoodForUser } from "@/lib/db/queries/entries";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/db/queries/entries");
vi.mock("@/lib/cache/insights", () => ({
  insightsCache: { invalidatePattern: vi.fn() },
}));

const ownerId = "user-owner";
const entryId = "entry-1";
const ctx = { params: Promise.resolve({ id: entryId }) };

function mockSession(userId: string | "") {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId,
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

const sampleEntry = {
  id: entryId,
  userId: ownerId,
  entryType: "food",
  name: "Salmon",
  severity: null,
  entryDate: "2026-09-01",
  entryTime: "12:00:00",
};

describe("DELETE /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(ownerId);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession("");
    const res = await DELETE(new Request("http://localhost/api/entries/entry-1", { method: "DELETE" }), ctx);
    expect(res.status).toBe(401);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it("returns 404 when the entry belongs to another user (or does not exist)", async () => {
    vi.mocked(deleteEntry).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost/api/entries/entry-1", { method: "DELETE" }), ctx);
    expect(res.status).toBe(404);
    expect(deleteEntry).toHaveBeenCalledWith(ownerId, entryId);
  });

  it("deletes an owned entry and returns it", async () => {
    vi.mocked(deleteEntry).mockResolvedValue(sampleEntry as never);
    const res = await DELETE(new Request("http://localhost/api/entries/entry-1", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entry.id).toBe(entryId);
    expect(deleteEntry).toHaveBeenCalledWith(ownerId, entryId);
  });
});

describe("PATCH /api/entries/[id]", () => {
  const patchReq = (body: unknown) =>
    new Request("http://localhost/api/entries/entry-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(ownerId);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession("");
    const res = await PATCH(patchReq({ name: "Trout" }), ctx);
    expect(res.status).toBe(401);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body", async () => {
    const res = await PATCH(patchReq({ severity: 42 }), ctx);
    expect(res.status).toBe(400);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const res = await PATCH(patchReq({}), ctx);
    expect(res.status).toBe(400);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("returns 404 when the entry is not owned by the user", async () => {
    vi.mocked(updateEntry).mockResolvedValue(null);
    const res = await PATCH(patchReq({ name: "Trout" }), ctx);
    expect(res.status).toBe(404);
    expect(updateEntry).toHaveBeenCalledWith(ownerId, entryId, { name: "Trout" });
  });

  it("updates an owned entry with the validated subset", async () => {
    vi.mocked(updateEntry).mockResolvedValue({ ...sampleEntry, name: "Trout", severity: 3 } as never);
    const res = await PATCH(
      patchReq({ name: "Trout", severity: 3, notes: "grilled", entryTime: "13:30", mealType: "lunch" }),
      ctx
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entry.name).toBe("Trout");
    expect(updateEntry).toHaveBeenCalledWith(ownerId, entryId, {
      name: "Trout",
      severity: 3,
      notes: "grilled",
      entryTime: "13:30",
      mealType: "lunch",
    });
  });
});

describe("PATCH /api/entries/[id] — foodId", () => {
  const foodId = "33333333-3333-4333-8333-333333333333";

  const patchReq = (body: unknown) =>
    new Request("http://localhost/api/entries/entry-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(ownerId);
  });

  it("returns 400 for a non-uuid foodId", async () => {
    const res = await PATCH(patchReq({ foodId: "not-a-uuid" }), ctx);
    expect(res.status).toBe(400);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("verifies the food and fills name from its displayName when name not sent", async () => {
    vi.mocked(getFoodForUser).mockResolvedValue({ id: foodId, displayName: "Wild Salmon" });
    vi.mocked(updateEntry).mockResolvedValue({ ...sampleEntry, name: "Wild Salmon" } as never);

    const res = await PATCH(patchReq({ foodId }), ctx);
    expect(res.status).toBe(200);
    expect(getFoodForUser).toHaveBeenCalledWith(ownerId, foodId);
    expect(updateEntry).toHaveBeenCalledWith(ownerId, entryId, {
      foodId,
      name: "Wild Salmon",
    });
  });

  it("keeps a caller-provided name when foodId is set", async () => {
    vi.mocked(getFoodForUser).mockResolvedValue({ id: foodId, displayName: "Wild Salmon" });
    vi.mocked(updateEntry).mockResolvedValue(sampleEntry as never);

    const res = await PATCH(patchReq({ foodId, name: "My Salmon Bowl" }), ctx);
    expect(res.status).toBe(200);
    expect(updateEntry).toHaveBeenCalledWith(ownerId, entryId, {
      foodId,
      name: "My Salmon Bowl",
    });
  });

  it("returns 400 when the food does not exist for this user", async () => {
    vi.mocked(getFoodForUser).mockResolvedValue(null);

    const res = await PATCH(patchReq({ foodId }), ctx);
    expect(res.status).toBe(400);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("clears foodId with null without a lookup", async () => {
    vi.mocked(updateEntry).mockResolvedValue(sampleEntry as never);

    const res = await PATCH(patchReq({ foodId: null }), ctx);
    expect(res.status).toBe(200);
    expect(getFoodForUser).not.toHaveBeenCalled();
    expect(updateEntry).toHaveBeenCalledWith(ownerId, entryId, { foodId: null });
  });
});
