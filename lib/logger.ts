/**
 * Structured logger for Pico Health.
 *
 * Outputs JSON in production (machine-parseable for Vercel logs / Datadog / etc.)
 * and human-readable format in development.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.info("user logged in", { userId: "abc", ip: "1.2.3.4" });
 *   log.error("db query failed", { route: "/api/entries", error });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_PROD = process.env.NODE_ENV === "production";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function serialize(entry: LogEntry): string {
  if (IS_PROD) {
    return JSON.stringify(entry);
  }
  // Dev: human-readable
  const { level, msg, ...rest } = entry;
  const meta = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${level.toUpperCase()}] ${msg}${meta}`;
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      error: err.message,
      stack: IS_PROD ? undefined : err.stack,
      name: err.name,
    };
  }
  return { error: String(err) };
}

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...meta,
  };

  // Handle error objects in meta
  if (meta?.error && meta.error instanceof Error) {
    Object.assign(entry, formatError(meta.error));
  }

  const line = serialize(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
