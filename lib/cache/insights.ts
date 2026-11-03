/**
 * Insights cache backed by Upstash Redis when configured,
 * with automatic in-memory fallback for local development.
 */

import { Redis } from "@upstash/redis";
import { log } from "@/lib/logger";

// ── Redis client (lazy init) ─────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
    log.info("redis cache initialized");
    return redis;
  }

  return null;
}

// ── In-memory fallback ───────────────────────────────────────────────

interface MemEntry {
  data: unknown;
  expiresAt: number;
}

const memStore = new Map<string, MemEntry>();

// Periodic cleanup for in-memory store
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now > entry.expiresAt) memStore.delete(key);
    }
  }, 10 * 60 * 1000);
}

// ── Public API ───────────────────────────────────────────────────────

const DEFAULT_TTL = 5 * 60; // 5 minutes in seconds

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();

  if (r) {
    try {
      const val = await r.get<T>(key);
      return val ?? null;
    } catch (err) {
      log.warn("redis get failed, falling back to memory", { key, error: err });
    }
  }

  // In-memory fallback
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export async function cacheSet<T>(
  key: string,
  data: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const r = getRedis();

  if (r) {
    try {
      await r.set(key, JSON.stringify(data), { ex: ttlSeconds });
      return;
    } catch (err) {
      log.warn("redis set failed, falling back to memory", { key, error: err });
    }
  }

  // In-memory fallback
  memStore.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheInvalidate(key: string): Promise<void> {
  const r = getRedis();

  if (r) {
    try {
      await r.del(key);
    } catch (err) {
      log.warn("redis del failed", { key, error: err });
    }
  }

  memStore.delete(key);
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const r = getRedis();

  if (r) {
    try {
      // Upstash supports SCAN-based pattern deletion
      const keys = await r.keys(pattern.replace(/\^|\$/g, "") + "*");
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } catch (err) {
      log.warn("redis pattern invalidation failed", { pattern, error: err });
    }
  }

  // Also clear in-memory
  const regex = new RegExp(pattern);
  for (const key of memStore.keys()) {
    if (regex.test(key)) memStore.delete(key);
  }
}

// Helper to generate cache keys
export function getCacheKey(
  userId: string,
  type: string,
  params?: Record<string, unknown>
): string {
  const paramStr = params ? JSON.stringify(params) : "";
  return `${userId}:${type}:${paramStr}`;
}

/**
 * Cache key for a user's insights. Every variant starts with
 * "<userId>:insights:" so invalidateUserInsights clears them all.
 */
export function insightsCacheKey(userId: string, variant: string, days: number): string {
  return `${userId}:insights:${variant}:${days}`;
}

/** Clear a user's cached insights. Call after any log, journal or clarifier change. */
export async function invalidateUserInsights(userId: string): Promise<void> {
  await cacheInvalidatePattern(`^${userId}:insights:`);
}

// ── Legacy compatibility ─────────────────────────────────────────────
// Sync wrapper for code that hasn't migrated to async yet.
// Falls back to in-memory only (no Redis).

class LegacyInsightsCache {
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : DEFAULT_TTL;
    // Fire-and-forget async set
    void cacheSet(key, data, ttlSeconds);
  }

  get<T>(key: string): T | null {
    // Sync path — memory only
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memStore.delete(key);
      return null;
    }
    return entry.data as T;
  }

  invalidate(key: string): void {
    void cacheInvalidate(key);
  }

  invalidatePattern(pattern: string): void {
    void cacheInvalidatePattern(pattern);
  }

  clear(): void {
    memStore.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now > entry.expiresAt) memStore.delete(key);
    }
  }
}

/** @deprecated Use cacheGet/cacheSet directly for new code */
export const insightsCache = new LegacyInsightsCache();
