import { describe, it, expect, beforeEach, vi } from "vitest";

const signUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signUp } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("signup must not use the admin client");
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
  SIGNUP_RATE_LIMIT: { limit: 5, windowSeconds: 600 },
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: () => { throw new Error("signup must not write to the DB"); } }),
}));

import { POST } from "./route";
import { rateLimit } from "@/lib/rate-limit";

const body = { firstName: "Pat", email: "Pat@Example.com", password: "correct horse" };
const post = (b: unknown = body) =>
  POST(new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify(b) }));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
  });

  it("starts the confirm-email flow instead of creating a confirmed user", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{}] }, session: null }, error: null });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmationRequired: true });
    expect(signUp).toHaveBeenCalledWith({
      email: "pat@example.com",
      password: "correct horse",
      options: {
        emailRedirectTo: "http://localhost/api/auth/callback?next=/onboarding",
        data: { firstName: "Pat" },
      },
    });
  });

  it("gives the same response for an email that is already registered", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "obfuscated", identities: [] }, session: null }, error: null });
    const existing = await post();
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "User already registered" } });
    const existing2 = await post();
    signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{}] }, session: null }, error: null });
    const fresh = await post();

    for (const res of [existing, existing2]) {
      expect(res.status).toBe(fresh.status);
      expect(await res.json()).toEqual({ ok: true, confirmationRequired: true });
    }
  });

  it("surfaces password-policy errors so the person can fix them", async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "weak_password", message: "Password is too weak" } });
    const res = await post();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too weak/);
  });

  it("returns 500 without details on unexpected auth errors", async () => {
    signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "unexpected_failure", message: "db exploded" } });
    const res = await post();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/exploded/);
  });

  it("keeps the IP rate limit", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const res = await post();
    expect(res.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith("signup:1.2.3.4", expect.anything());
    expect(signUp).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    expect((await post({ ...body, password: "short" })).status).toBe(400);
  });
});
