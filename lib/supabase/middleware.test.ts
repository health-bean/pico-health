import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { updateSession, isPublicApiRoute } from "./middleware";

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
    const res = await updateSession(req("/log"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?redirect=%2Flog");
  });

  it("returns 401 JSON for unauthenticated API calls", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateSession(req("/api/entries"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("lets unauthenticated calls through to public API routes", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    for (const path of [
      "/api/auth/login",
      "/api/auth/signup",
      "/api/auth/callback",
      "/api/billing/webhook",
      "/api/cron/purge-deleted-accounts",
      "/api/waitlist",
    ]) {
      const res = await updateSession(req(path));
      expect(res.status, path).toBe(200);
    }
  });

  it("does not treat lookalike paths as public", () => {
    expect(isPublicApiRoute("/api/billing/webhook-evil")).toBe(false);
    expect(isPublicApiRoute("/api/billing/checkout")).toBe(false);
    expect(isPublicApiRoute("/api/authx")).toBe(false);
    expect(isPublicApiRoute("/api/waitlist/export")).toBe(false);
    expect(isPublicApiRoute("/api/cron")).toBe(true);
  });

  it("passes authenticated API calls through", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await updateSession(req("/api/entries"));
    expect(res.status).toBe(200);
  });
});
