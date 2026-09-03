import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { GET as GET_PENDING } from "./pending/route";
import { POST } from "./answer/route";
import { getSessionFromCookies } from "@/lib/auth/session";
import { answerClarifier, getClarifiersForEntries, getPendingClarifiers } from "@/lib/clarifiers/service";
import { insightsCache } from "@/lib/cache/insights";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/clarifiers/service");
vi.mock("@/lib/cache/insights", () => ({
  insightsCache: { invalidatePattern: vi.fn() },
}));

const userId = "user-1";
const entryId = "11111111-1111-4111-8111-111111111111";

function mockSession(id: string | "") {
  vi.mocked(getSessionFromCookies).mockResolvedValue({ userId: id } as unknown as Awaited<
    ReturnType<typeof getSessionFromCookies>
  >);
}

const sample = {
  entryId,
  foodId: "f1",
  foodName: "Salmon",
  ruleId: "histamine-preparation",
  dimension: "preparation" as const,
  question: "Salmon — fresh or leftover?",
  why: "matters for histamine",
  options: [{ value: "fresh", label: "Fresh" }],
  multi: false,
  suggested: null,
};

describe("GET /api/clarifiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
  });

  it("401 when unauthenticated", async () => {
    mockSession("");
    const res = await GET(new Request(`http://x/api/clarifiers?entryIds=${entryId}`));
    expect(res.status).toBe(401);
  });

  it("400 on a malformed id list", async () => {
    const res = await GET(new Request("http://x/api/clarifiers?entryIds=not-a-uuid"));
    expect(res.status).toBe(400);
    expect(getClarifiersForEntries).not.toHaveBeenCalled();
  });

  it("returns the service result scoped to the session user", async () => {
    vi.mocked(getClarifiersForEntries).mockResolvedValue([sample]);
    const res = await GET(new Request(`http://x/api/clarifiers?entryIds=${entryId}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clarifiers: [sample] });
    expect(getClarifiersForEntries).toHaveBeenCalledWith(userId, [entryId]);
  });
});

describe("GET /api/clarifiers/pending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
  });

  it("400 without a valid date", async () => {
    const res = await GET_PENDING(new Request("http://x/api/clarifiers/pending?date=yesterday"));
    expect(res.status).toBe(400);
  });

  it("asks the service for at most 3", async () => {
    vi.mocked(getPendingClarifiers).mockResolvedValue([]);
    const res = await GET_PENDING(new Request("http://x/api/clarifiers/pending?date=2026-09-03"));
    expect(res.status).toBe(200);
    expect(getPendingClarifiers).toHaveBeenCalledWith(userId, "2026-09-03", 3);
  });
});

describe("POST /api/clarifiers/answer", () => {
  const post = (body: unknown) =>
    new Request("http://x/api/clarifiers/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(userId);
  });

  it("400 on an unknown dimension", async () => {
    const res = await POST(post({ entryId, dimension: "ripeness", answer: "ripe" }));
    expect(res.status).toBe(400);
    expect(answerClarifier).not.toHaveBeenCalled();
  });

  it("normalises a single answer to an array and invalidates insights", async () => {
    vi.mocked(answerClarifier).mockResolvedValue({ ok: true, structuredContent: { preparation: ["fresh"] } });
    const res = await POST(post({ entryId, dimension: "preparation", answer: "fresh" }));
    expect(res.status).toBe(200);
    expect(answerClarifier).toHaveBeenCalledWith(userId, entryId, "preparation", ["fresh"]);
    expect(insightsCache.invalidatePattern).toHaveBeenCalledWith(`^${userId}:insights:`);
  });

  it("passes skips through without touching the insights cache", async () => {
    vi.mocked(answerClarifier).mockResolvedValue({ ok: true, structuredContent: null });
    const res = await POST(post({ entryId, dimension: "quantity", answer: "skipped" }));
    expect(res.status).toBe(200);
    expect(answerClarifier).toHaveBeenCalledWith(userId, entryId, "quantity", "skipped");
    expect(insightsCache.invalidatePattern).not.toHaveBeenCalled();
  });

  it("404 when the entry is not the user's, 400 when the answer is not an option", async () => {
    vi.mocked(answerClarifier).mockResolvedValue({ ok: false, reason: "not_found" });
    expect((await POST(post({ entryId, dimension: "quantity", answer: "more" }))).status).toBe(404);
    vi.mocked(answerClarifier).mockResolvedValue({ ok: false, reason: "invalid_answer" });
    expect((await POST(post({ entryId, dimension: "quantity", answer: "heaps" }))).status).toBe(400);
  });
});
