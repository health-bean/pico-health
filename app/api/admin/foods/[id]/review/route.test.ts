import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const foodId = "22222222-2222-4222-8222-222222222222";
const ctx = { params: Promise.resolve({ id: foodId }) };

function mockSession(userId: string | null, isAdmin = false) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId,
    isAdmin,
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

function mockSelect(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => rows),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>);
}

function mockUpdateReturning(rows: unknown[]) {
  const setMock = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(async () => rows),
    })),
  }));
  vi.mocked(db.update).mockReturnValue({ set: setMock } as unknown as ReturnType<typeof db.update>);
  return setMock;
}

function req(body: unknown) {
  return new Request(`http://localhost/api/admin/foods/${foodId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/foods/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("admin-1", true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession(null);
    const res = await POST(req({ reviewedBy: "Dr. Filo" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admins", async () => {
    mockSession("user-1", false);
    const res = await POST(req({ reviewedBy: "Dr. Filo" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when reviewedBy is too short", async () => {
    const res = await POST(req({ reviewedBy: "x" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid correction value", async () => {
    const res = await POST(req({ reviewedBy: "Dr. Filo", corrections: { oxalate: "banana" } }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the food has no property row", async () => {
    mockSelect([]);
    const res = await POST(req({ reviewedBy: "Dr. Filo" }), ctx);
    expect(res.status).toBe(404);
  });

  it("applies corrections and marks the row practitioner_reviewed", async () => {
    mockSelect([{ id: "tp-1", foodId, reviewStatus: "ai_proposed" }]);
    const updated = {
      id: "tp-1",
      foodId,
      oxalate: "high",
      reviewStatus: "practitioner_reviewed",
      reviewedBy: "Dr. Filo",
    };
    const setMock = mockUpdateReturning([updated]);

    const res = await POST(
      req({ reviewedBy: "Dr. Filo", corrections: { oxalate: "high", nightshade: true } }),
      ctx
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reviewStatus).toBe("practitioner_reviewed");

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        oxalate: "high",
        nightshade: true,
        reviewStatus: "practitioner_reviewed",
        reviewedBy: "Dr. Filo",
        reviewedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    );
  });

  it("marks reviewed without corrections", async () => {
    mockSelect([{ id: "tp-1", foodId, reviewStatus: "unreviewed" }]);
    const setMock = mockUpdateReturning([{ id: "tp-1", reviewStatus: "practitioner_reviewed" }]);

    const res = await POST(req({ reviewedBy: "Dr. Filo" }), ctx);
    expect(res.status).toBe(200);
    const setArg = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.reviewStatus).toBe("practitioner_reviewed");
    expect(setArg.oxalate).toBeUndefined();
  });
});
