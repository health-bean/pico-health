import { describe, it, expect, beforeEach, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession, verifyOtp } })),
}));
vi.mock("@/lib/auth/profile", () => ({ ensureProfile: vi.fn() }));

const limit = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    update: () => ({ set: () => ({ where: vi.fn() }) }),
  },
}));

import { GET } from "./route";
import { ensureProfile } from "@/lib/auth/profile";

const user = { id: "u1", email: "pat@example.com", user_metadata: { firstName: "Pat" } };
const get = (qs: string) => GET(new Request(`http://localhost/api/auth/callback?${qs}`));

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limit.mockResolvedValue([{ onboardingCompleted: true, deletionRequestedAt: null }]);
  });

  it("confirms a signup from a code link and creates the profile, then onboarding", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user }, error: null });
    vi.mocked(ensureProfile).mockResolvedValue(true);
    const res = await get("code=abc&next=/onboarding");
    expect(ensureProfile).toHaveBeenCalledWith(user);
    expect(res.headers.get("location")).toBe("http://localhost/onboarding");
  });

  it("confirms a signup from a token_hash link (works across devices)", async () => {
    verifyOtp.mockResolvedValue({ data: { user }, error: null });
    vi.mocked(ensureProfile).mockResolvedValue(true);
    const res = await get("token_hash=th&type=email&next=/onboarding");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "th", type: "email" });
    expect(res.headers.get("location")).toBe("http://localhost/onboarding");
  });

  it("rejects unknown otp types", async () => {
    const res = await get("token_hash=th&type=bogus");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/login?error=auth_callback_failed");
  });

  it("sends existing, onboarded users to next", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user }, error: null });
    vi.mocked(ensureProfile).mockResolvedValue(false);
    const res = await get("code=abc&next=/reset-password");
    expect(res.headers.get("location")).toBe("http://localhost/reset-password");
  });

  it("redirects to login when verification fails", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    const res = await get("token_hash=th&type=email");
    expect(res.headers.get("location")).toContain("/login?error=auth_callback_failed");
    expect(ensureProfile).not.toHaveBeenCalled();
  });
});
