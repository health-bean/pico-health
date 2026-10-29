import { describe, it, expect } from "vitest";
import { normalizeRef, waitlistSchema } from "./waitlist";

describe("normalizeRef", () => {
  it("keeps short neutral codes, lowercased", () => {
    expect(normalizeRef("Seattle")).toBe("seattle");
    expect(normalizeRef("pnw-2")).toBe("pnw-2");
  });

  it("drops anything that isn't a plain slug", () => {
    expect(normalizeRef("")).toBeNull();
    expect(normalizeRef("<script>")).toBeNull();
    expect(normalizeRef("a b")).toBeNull();
    expect(normalizeRef("x".repeat(41))).toBeNull();
    expect(normalizeRef(42)).toBeNull();
    expect(normalizeRef(undefined)).toBeNull();
  });
});

describe("waitlistSchema", () => {
  it("normalizes the email and ref", () => {
    expect(waitlistSchema.parse({ email: "  Sam@Example.COM ", ref: "Seattle" })).toEqual({ email: "sam@example.com", ref: "seattle" });
  });

  it("accepts a missing ref", () => {
    expect(waitlistSchema.parse({ email: "sam@example.com" })).toEqual({ email: "sam@example.com", ref: null });
  });

  it("rejects bad emails", () => {
    expect(waitlistSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(waitlistSchema.safeParse({}).success).toBe(false);
  });
});
