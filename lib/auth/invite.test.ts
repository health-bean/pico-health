import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isInvited, mayHaveProfile } from "./invite";
import { db } from "@/lib/db";

vi.mock("@/lib/db");

function selects(...results: unknown[][]) {
  for (const rows of results) {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "where", "limit"]) c[k] = vi.fn(() => c);
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve(rows).then(ok);
    vi.mocked(db.select).mockReturnValueOnce(c as never);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OPEN_SIGNUP;
});
afterEach(() => {
  delete process.env.OPEN_SIGNUP;
});

describe("invite-only sign-up", () => {
  it("lets in an invited email", async () => {
    selects([{ id: "w1" }]);
    expect(await isInvited("Amy@Example.com ")).toBe(true);
  });

  it("keeps out an email that isn't invited", async () => {
    selects([]);
    expect(await isInvited("stranger@example.com")).toBe(false);
  });

  it("keeps out a missing email without querying", async () => {
    expect(await isInvited(null)).toBe(false);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("OPEN_SIGNUP=true reopens sign-up", async () => {
    process.env.OPEN_SIGNUP = "true";
    expect(await isInvited("anyone@example.com")).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("existing accounts always keep their profile", async () => {
    selects([{ id: "u1" }]);
    expect(await mayHaveProfile({ id: "u1", email: "not-on-any-list@example.com" })).toBe(true);
  });

  it("a new Google user who isn't invited gets no profile", async () => {
    selects([], []);
    expect(await mayHaveProfile({ id: "u2", email: "new@example.com" })).toBe(false);
  });
});
