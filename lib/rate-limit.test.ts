import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const limitMock = vi.fn();
vi.mock("@upstash/redis", () => ({ Redis: vi.fn(function Redis() {}) }));
vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn(function Ratelimit() {
    return { limit: limitMock };
  }) as unknown as { slidingWindow: () => unknown };
  Ratelimit.slidingWindow = vi.fn();
  return { Ratelimit };
});

const AI = { limit: 30, windowSeconds: 60 };

async function load() {
  vi.resetModules();
  return import("./rate-limit");
}

async function hits(n: number, rateLimit: Awaited<ReturnType<typeof load>>["rateLimit"], strict: boolean) {
  let allowed = 0;
  for (let i = 0; i < n; i++) {
    if ((await rateLimit("chat:u1", AI, { strict })).allowed) allowed++;
  }
  return allowed;
}

describe("rateLimit fallbacks", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("uses the configured in-memory limit in development without Upstash", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { rateLimit } = await load();
    expect(await hits(30, rateLimit, true)).toBe(30);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("strict limits fall back to a conservative local limit in production without Upstash, logging once", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { rateLimit, STRICT_FALLBACK_RATE_LIMIT } = await load();
    expect(await hits(30, rateLimit, true)).toBe(STRICT_FALLBACK_RATE_LIMIT.limit);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("strict limits fall back conservatively when Upstash errors in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    limitMock.mockRejectedValue(new Error("upstash down"));
    const { rateLimit, STRICT_FALLBACK_RATE_LIMIT } = await load();
    expect(await hits(30, rateLimit, true)).toBe(STRICT_FALLBACK_RATE_LIMIT.limit);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("non-strict limits keep the configured in-memory fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { rateLimit } = await load();
    expect(await hits(30, rateLimit, false)).toBe(30);
  });

  it("uses Upstash when it answers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: 123 });
    const { rateLimit } = await load();
    expect(await rateLimit("chat:u1", AI, { strict: true })).toEqual({ allowed: false, remaining: 0, resetAt: 123 });
  });
});
