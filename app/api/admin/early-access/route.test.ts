import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

function session(isAdmin: boolean) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({ userId: "u1", isAdmin } as unknown as Awaited<
    ReturnType<typeof getSessionFromCookies>
  >);
}

function insert() {
  const values = vi.fn(() => ({
    onConflictDoUpdate: vi.fn(() => ({ returning: vi.fn(async () => [{ email: "amy@example.com" }]) })),
  }));
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return values;
}

const req = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  session(true);
});

describe("POST /api/admin/early-access", () => {
  it("is admin only", async () => {
    session(false);
    expect((await POST(req({ email: "amy@example.com" }))).status).toBe(403);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("invites a normalized email", async () => {
    const values = insert();
    const res = await POST(req({ email: "  Amy@Example.com " }));
    expect(res.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ email: "amy@example.com", invitedAt: expect.any(Date) }));
  });

  it("rejects a bad email", async () => {
    expect((await POST(req({ email: "nope" }))).status).toBe(400);
  });
});
