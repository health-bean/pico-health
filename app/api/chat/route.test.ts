import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as chat } from "./route";
import { POST as adminChat } from "../admin/chat/route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { checkAiQuota } from "@/lib/billing/enforce-quota";
import { runConversationLoop } from "@/lib/ai/client";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  CHAT_RATE_LIMIT: { limit: 30, windowSeconds: 60 },
  ADMIN_CHAT_RATE_LIMIT: { limit: 30, windowSeconds: 60 },
}));
vi.mock("@/lib/ai/client", () => ({
  getProvider: vi.fn(() => ({ id: "mock-provider" })),
  runConversationLoop: vi.fn(),
  toNeutralTools: vi.fn((t: unknown) => t),
}));
vi.mock("@/lib/billing/enforce-quota", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/enforce-quota")>()),
  checkAiQuota: vi.fn(),
}));
vi.mock("@/lib/ai/usage", () => ({
  recordUsage: vi.fn(async () => {}),
  keepAliveUntil: vi.fn(() => () => {}),
}));

const userId = "11111111-1111-4111-8111-111111111111";
const bad = () =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });

describe("chat routes reject malformed JSON with 400", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId,
      isAdmin: true,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 } as never);
    vi.mocked(checkAiQuota).mockResolvedValue({ allowed: true, remainingBudgetUsd: 0.5 } as never);
  });

  it("/api/chat", async () => {
    const res = await chat(bad());
    expect(res.status).toBe(400);
    expect(runConversationLoop).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("/api/admin/chat", async () => {
    const res = await adminChat(bad());
    expect(res.status).toBe(400);
    expect(runConversationLoop).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
