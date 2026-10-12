import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { getSessionFromCookies } from "@/lib/auth/session";
import { markMealCheckin } from "@/lib/db/queries/entries";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/db/queries/entries");

function mockSession(userId: string) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({ userId } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}
const req = (body: unknown) =>
  new Request("http://localhost/api/entries/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/entries/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession("user-1");
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession("");
    expect((await POST(req({ entryDate: "2026-10-12", mealTime: "12:40", answer: "fine" }))).status).toBe(401);
    expect(markMealCheckin).not.toHaveBeenCalled();
  });

  it("rejects an answer it does not know", async () => {
    expect((await POST(req({ entryDate: "2026-10-12", mealTime: "12:40", answer: "great" }))).status).toBe(400);
  });

  it("marks the signed-in user's meal, normalising the time", async () => {
    vi.mocked(markMealCheckin).mockResolvedValue(2);
    const res = await POST(req({ entryDate: "2026-10-12", mealTime: "12:40", answer: "fine" }));
    expect(res.status).toBe(200);
    expect(markMealCheckin).toHaveBeenCalledWith("user-1", "2026-10-12", "12:40:00", "fine");
  });

  it("returns 404 when no meal of this user's matches", async () => {
    vi.mocked(markMealCheckin).mockResolvedValue(0);
    expect((await POST(req({ entryDate: "2026-10-12", mealTime: "12:40:00", answer: "fine" }))).status).toBe(404);
  });
});
