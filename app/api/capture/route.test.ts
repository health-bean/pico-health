import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { getSessionFromCookies } from "@/lib/auth/session";
import { rateLimit, CHAT_RATE_LIMIT } from "@/lib/rate-limit";
import { getProvider, runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { processToolCall } from "@/lib/ai/extract";
import { loadUserProtocolInfo } from "@/lib/ai/user-protocol";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
  CHAT_RATE_LIMIT: { limit: 30, windowSeconds: 60 },
}));
vi.mock("@/lib/ai/client", () => ({
  getProvider: vi.fn(() => ({ id: "mock-provider" })),
  runConversationLoop: vi.fn(),
  toNeutralTools: vi.fn((t: unknown) => t),
}));
vi.mock("@/lib/ai/extract", () => ({
  processToolCall: vi.fn(),
}));
vi.mock("@/lib/ai/user-protocol", () => ({
  loadUserProtocolInfo: vi.fn(async () => ({})),
}));

const userId = "11111111-1111-4111-8111-111111111111";

const sampleEntry = {
  id: "entry-1",
  entryType: "food",
  name: "Salmon",
  severity: null,
  details: null,
  entryDate: "2026-09-02",
  entryTime: "12:30",
  mealType: "lunch",
  foodId: "food-1",
  protocolViolations: [],
};

type LoopParams = Parameters<typeof runConversationLoop>[0];

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

async function readEvents(res: Response) {
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Small valid jpeg data URI. */
const tinyImage = "data:image/jpeg;base64,QUJDRA==";

describe("POST /api/capture", () => {
  let loopParams: LoopParams | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    loopParams = undefined;

    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
    });

    vi.mocked(runConversationLoop).mockImplementation(async (params) => {
      loopParams = params;
      params.onExtracted?.([sampleEntry]);
      return { text: "", extractedEntries: [sampleEntry] };
    });
  });

  // ── Auth + rate limiting ──────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    const res = await post({ text: "salmon" });
    expect(res.status).toBe(401);
    expect(runConversationLoop).not.toHaveBeenCalled();
  });

  it("rate limits with CHAT_RATE_LIMIT on a capture-scoped key", async () => {
    const res = await post({ text: "salmon" });
    expect(res.status).toBe(200);
    expect(rateLimit).toHaveBeenCalledWith(
      `capture:${userId}:1.2.3.4`,
      CHAT_RATE_LIMIT
    );
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    });

    const res = await post({ text: "salmon" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(runConversationLoop).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────

  it("returns 400 when neither text nor imageBase64 is provided", async () => {
    const res = await post({ entryDate: "2026-09-02" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when text exceeds 2000 characters", async () => {
    const res = await post({ text: "a".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid entryDate / localTime formats", async () => {
    expect((await post({ text: "x", entryDate: "09/02/2026" })).status).toBe(400);
    expect((await post({ text: "x", localTime: "9:5" })).status).toBe(400);
  });

  it("returns 400 when imageBase64 is not a data URI", async () => {
    const res = await post({ imageBase64: "QUJDRA==" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when the decoded image exceeds 6MB", async () => {
    // 8,388,612 base64 chars decode to ~6,291,459 bytes (> 6MB).
    const res = await post({
      imageBase64: "data:image/jpeg;base64," + "A".repeat(8_388_612),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/too large/i);
  });

  // ── NDJSON stream ─────────────────────────────────────────────────

  it("streams extracted and done events for a text capture", async () => {
    const res = await post({ text: "salmon and rice for lunch" });
    expect(res.status).toBe(200);

    const events = await readEvents(res);
    expect(events).toEqual([
      { type: "extracted", entries: [sampleEntry] },
      { type: "done", entryCount: 1 },
    ]);
  });

  it("emits a note event only when the model produced text", async () => {
    vi.mocked(runConversationLoop).mockResolvedValue({
      text: "I logged 2 foods but didn't catch the last item.",
      extractedEntries: [sampleEntry, sampleEntry],
    });

    const events = await readEvents(await post({ text: "salmon, rice, and mumble" }));
    expect(events).toEqual([
      {
        type: "note",
        content: "I logged 2 foods but didn't catch the last item.",
      },
      { type: "done", entryCount: 2 },
    ]);
  });

  it("emits an error event when the conversation loop fails", async () => {
    vi.mocked(runConversationLoop).mockRejectedValue(new Error("provider down"));

    const res = await post({ text: "salmon" });
    expect(res.status).toBe(200);
    const events = await readEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(typeof events[0].message).toBe("string");
  });

  // ── Loop wiring ───────────────────────────────────────────────────

  it("uses the daily-chat provider, capture tools only, maxRounds 3 and maxTokens 512 for text", async () => {
    await readEvents(await post({ text: "salmon" }));

    expect(getProvider).toHaveBeenCalledWith("daily-chat");
    expect(loopParams?.maxRounds).toBe(3);
    expect(loopParams?.maxTokens).toBe(512);
    expect(loopParams?.messages).toEqual([{ role: "user", content: "salmon" }]);

    const passedTools = vi.mocked(toNeutralTools).mock.calls[0][0] as Array<{ name: string }>;
    expect(passedTools.map((t) => t.name)).toEqual(["log_entries", "log_exercise"]);
  });

  it("uses the food-photo-parse provider and image content parts for a photo", async () => {
    await readEvents(await post({ imageBase64: tinyImage, imageMimeType: "image/jpeg" }));

    expect(getProvider).toHaveBeenCalledWith("food-photo-parse");
    expect(loopParams?.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "image", imageData: tinyImage, mimeType: "image/jpeg" },
          { type: "text", text: "Log the food in this photo." },
        ],
      },
    ]);
  });

  it("infers the image mime type from the data URI when imageMimeType is omitted", async () => {
    const png = "data:image/png;base64,QUJDRA==";
    await readEvents(await post({ imageBase64: png, text: "my dinner" }));

    expect(loopParams?.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "image", imageData: png, mimeType: "image/png" },
          { type: "text", text: "my dinner" },
        ],
      },
    ]);
  });

  it("passes a null messageId to processToolCall", async () => {
    vi.mocked(processToolCall).mockResolvedValue({ result: { success: true } });
    await readEvents(await post({ text: "salmon" }));

    expect(loopParams).toBeDefined();
    await loopParams!.toolExecutor("log_entries", { entries: [] });
    expect(processToolCall).toHaveBeenCalledWith(
      "log_entries",
      { entries: [] },
      userId,
      null
    );
  });

  it("builds a capture prompt carrying date, time and protocol", async () => {
    vi.mocked(loadUserProtocolInfo).mockResolvedValue({
      protocolName: "AIP Phase 1",
      protocolRulesText: "- AVOID: nightshades",
    });

    await readEvents(
      await post({ text: "salmon", entryDate: "2026-08-30", localTime: "08:15" })
    );

    const prompt = loopParams?.systemPrompt ?? "";
    expect(prompt).toContain("2026-08-30");
    expect(prompt).toContain("08:15");
    expect(prompt).toContain("AIP Phase 1");
    expect(prompt).toContain("- AVOID: nightshades");
  });

  it("still captures when protocol loading fails", async () => {
    vi.mocked(loadUserProtocolInfo).mockRejectedValue(new Error("db down"));

    const events = await readEvents(await post({ text: "salmon" }));
    expect(events.at(-1)).toEqual({ type: "done", entryCount: 1 });
  });
});
