import { describe, it, expect } from "vitest";
import { buildCsp } from "./csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  const prod = buildCsp({ supabaseUrl: "https://abc.supabase.co", isDev: false });

  it("allows the Supabase origin over https and wss", () => {
    const connect = directive(prod, "connect-src");
    expect(connect).toContain("'self'");
    expect(connect).toContain("https://abc.supabase.co");
    expect(connect).toContain("wss://abc.supabase.co");
  });

  it("locks down framing, plugins and base", () => {
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
    expect(prod).toContain("upgrade-insecure-requests");
  });

  it("no unsafe-eval in production, but present in dev", () => {
    expect(directive(prod, "script-src")).not.toContain("unsafe-eval");
    const dev = buildCsp({ supabaseUrl: "http://127.0.0.1:54321", isDev: true });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws://127.0.0.1:54321");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("tolerates a missing or malformed Supabase URL", () => {
    expect(directive(buildCsp({ isDev: false }), "connect-src")).toBe("connect-src 'self'");
    expect(directive(buildCsp({ supabaseUrl: "not a url", isDev: false }), "connect-src")).toBe("connect-src 'self'");
  });

  it("allows blob/data images for capture previews", () => {
    const img = directive(prod, "img-src");
    expect(img).toContain("blob:");
    expect(img).toContain("data:");
  });
});
