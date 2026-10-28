import { NextResponse } from "next/server";
import { z, type ZodError } from "zod";

/**
 * Shared request-validation helpers for route handlers.
 *
 * UUIDs: the shape check is deliberately permissive (8-4-4-4-12 hex, any
 * version/variant nibble) because some seeded protocol ids are not
 * RFC-4122 variants, and Postgres's uuid type accepts any of them. The point
 * is to turn garbage ids into a 400/404 instead of a Postgres cast error (500).
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** A Zod string that must look like a Postgres uuid. */
export const uuidString = () => z.string().regex(UUID_RE, "Invalid id");

/** Sentinel returned by readJson when the body is not valid JSON. */
export const INVALID_JSON = Symbol("invalid-json");

/** request.json() that never throws: malformed bodies become INVALID_JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export function invalidJsonResponse() {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", details: error.flatten() },
    { status: 400 }
  );
}

/**
 * Parse a request body against a schema. Returns either the parsed data or a
 * ready-made 400 response (bad JSON or schema failure).
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; response?: undefined } | { data?: undefined; response: NextResponse }> {
  const body = await readJson(request);
  if (body === INVALID_JSON) return { response: invalidJsonResponse() };
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: validationErrorResponse(parsed.error) };
  return { data: parsed.data };
}

/** True if the IANA timezone name is one this runtime can format with. */
export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 50) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const timezoneString = () =>
  z.string().max(50).refine(isValidTimezone, { message: "Unknown timezone" });

/** Serialized-size bound for free-form JSON (e.g. structuredContent). */
export function jsonByteLength(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").length;
  } catch {
    return Infinity;
  }
}

export const MAX_STRUCTURED_CONTENT_BYTES = 16 * 1024;

/** A JSON object whose serialized form is at most `maxBytes`. */
export const boundedJsonObject = (maxBytes = MAX_STRUCTURED_CONTENT_BYTES) =>
  z
    .record(z.string(), z.unknown())
    .refine((v) => jsonByteLength(v) <= maxBytes, {
      message: `Must be at most ${maxBytes} bytes when serialized`,
    });
