import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { updateSession } from "./middleware";

const req = (path: string) => new NextRequest(new URL(path, "http://localhost"));

describe("updateSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends signed-in people from the landing page and auth screens into the app", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    for (const path of ["/", "/login", "/signup"]) {
      const res = await updateSession(req(path));
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, path).toBe("/log");
    }
  });

  it("shows the landing page and login to signed-out visitors", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    for (const path of ["/", "/login", "/signup"]) {
      const res = await updateSession(req(path));
      expect(res.status, path).toBe(200);
    }
  });

  it("still sends signed-out visitors from app pages to login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(req("/insights"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets the public waitlist endpoint through without a session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(req("/api/waitlist"));
    expect(res.status).toBe(200);
  });
});
