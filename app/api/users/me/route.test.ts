import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

const userId = "11111111-1111-4111-8111-111111111111";

function mockSession(id: string | null) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId: id,
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

function mockSelect(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  } as unknown as ReturnType<typeof db.select>);
}

function mockUpdate() {
  const setMock = vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  }));
  vi.mocked(db.update).mockReturnValue({
    set: setMock,
  } as unknown as ReturnType<typeof db.update>);
  return setMock;
}

function patchReq(body: unknown) {
  return new Request("http://localhost/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the profile including tracking goal fields", async () => {
    mockSelect([
      {
        id: userId,
        email: "dee@example.com",
        firstName: "Dee",
        isAdmin: false,
        currentProtocolId: null,
        onboardingCompleted: true,
        healthGoals: null,
        timezone: "America/New_York",
        trackingGoalDays: 30,
        trackingGoalStartDate: "2026-08-25",
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.trackingGoalDays).toBe(30);
    expect(data.user.trackingGoalStartDate).toBe("2026-08-25");
  });

  it("returns 404 when the profile is missing", async () => {
    mockSelect([]);
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const res = await PATCH(patchReq({ trackingGoalDays: 30 }));
    expect(res.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("sets trackingGoalDays and stamps trackingGoalStartDate with today", async () => {
    mockSelect([{ timezone: "America/New_York" }]);
    const setMock = mockUpdate();

    const res = await PATCH(patchReq({ trackingGoalDays: 30 }));
    expect(res.status).toBe(200);

    expect(setMock).toHaveBeenCalledTimes(1);
    const setArg = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.trackingGoalDays).toBe(30);
    expect(setArg.trackingGoalStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("clears both goal fields when trackingGoalDays is null", async () => {
    const setMock = mockUpdate();

    const res = await PATCH(patchReq({ trackingGoalDays: null }));
    expect(res.status).toBe(200);

    expect(db.select).not.toHaveBeenCalled();
    const setArg = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.trackingGoalDays).toBeNull();
    expect(setArg.trackingGoalStartDate).toBeNull();
  });

  it("rejects out-of-range or non-integer trackingGoalDays", async () => {
    for (const bad of [5, 366, 30.5, "30", true]) {
      const res = await PATCH(patchReq({ trackingGoalDays: bad }));
      expect(res.status).toBe(400);
    }
    expect(db.update).not.toHaveBeenCalled();
  });

  it("still updates other profile fields without touching the goal", async () => {
    const setMock = mockUpdate();

    const res = await PATCH(patchReq({ firstName: "Dee" }));
    expect(res.status).toBe(200);

    const setArg = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.firstName).toBe("Dee");
    expect("trackingGoalDays" in setArg).toBe(false);
    expect("trackingGoalStartDate" in setArg).toBe(false);
  });
});
