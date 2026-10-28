import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  isUuid,
  isValidTimezone,
  jsonByteLength,
  boundedJsonObject,
  parseBody,
  readJson,
  INVALID_JSON,
} from "./validation";

const req = (body: string) => new Request("http://localhost/x", { method: "POST", body });

describe("api validation helpers", () => {
  it("isUuid accepts any 8-4-4-4-12 hex, rejects the rest", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    // Seeded protocol ids are not RFC variants; Postgres still takes them.
    expect(isUuid("c02d0769-8fd3-6944-c7c6-82152365c4fb")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("11111111-1111-4111-8111-111111111111; drop")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it("isValidTimezone", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Mars/Base")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });

  it("readJson never throws", async () => {
    expect(await readJson(req("{bad"))).toBe(INVALID_JSON);
    expect(await readJson(req('{"a":1}'))).toEqual({ a: 1 });
  });

  it("parseBody returns 400 for bad JSON and schema failures", async () => {
    const schema = z.object({ a: z.number() });
    expect((await parseBody(req("{bad"), schema)).response?.status).toBe(400);
    expect((await parseBody(req('{"a":"x"}'), schema)).response?.status).toBe(400);
    expect((await parseBody(req('{"a":1}'), schema)).data).toEqual({ a: 1 });
  });

  it("boundedJsonObject enforces serialized size", () => {
    const schema = boundedJsonObject(100);
    expect(schema.safeParse({ ok: "x" }).success).toBe(true);
    expect(schema.safeParse({ big: "x".repeat(200) }).success).toBe(false);
    expect(schema.safeParse(["not", "an", "object"]).success).toBe(false);
    expect(jsonByteLength({ a: "é" })).toBe(new TextEncoder().encode('{"a":"é"}').length);
  });
});
