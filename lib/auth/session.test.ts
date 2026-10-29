import { describe, it, expect, beforeEach, vi } from "vitest";

const getClaims = vi.fn();
const getSession = vi.fn();
const getUser = vi.fn();
const limit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims, getSession, getUser } })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
  },
}));

import { getSessionFromCookies } from "./session";

describe("getSessionFromCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // If anything still trusted the raw cookie, it would see this forged user.
    getSession.mockResolvedValue({
      data: { session: { user: { id: "forged-id", email: "attacker@example.com" } } },
      error: null,
    });
    limit.mockResolvedValue([{ firstName: "Pat", isAdmin: true, timezone: "UTC" }]);
  });

  it("returns an empty session when the JWT fails verification", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid JWT signature") });
    const session = await getSessionFromCookies();
    expect(session.userId).toBe("");
    expect(session.isAdmin).toBe(false);
    expect(limit).not.toHaveBeenCalled();
  });

  it("returns an empty session when there is no token at all", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const session = await getSessionFromCookies();
    expect(session.userId).toBe("");
  });

  it("returns an empty session when verified claims carry no subject", async () => {
    getClaims.mockResolvedValue({ data: { claims: { email: "x@example.com" } }, error: null });
    const session = await getSessionFromCookies();
    expect(session.userId).toBe("");
  });

  it("returns an empty session when getClaims throws", async () => {
    getClaims.mockRejectedValue(new Error("network"));
    const session = await getSessionFromCookies();
    expect(session.userId).toBe("");
  });

  it("uses the verified subject and email, never the cookie's user object", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "real-id", email: "real@example.com", user_metadata: { firstName: "Meta" } } },
      error: null,
    });
    const session = await getSessionFromCookies();
    expect(session).toEqual({
      userId: "real-id",
      email: "real@example.com",
      firstName: "Pat",
      isAdmin: true,
      timezone: "UTC",
    });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("falls back to defaults when no profile row exists", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "real-id", email: "real@example.com", user_metadata: { firstName: "Meta" } } },
      error: null,
    });
    limit.mockResolvedValue([]);
    const session = await getSessionFromCookies();
    expect(session.firstName).toBe("Meta");
    expect(session.isAdmin).toBe(false);
    expect(session.timezone).toBe("America/New_York");
  });
});
