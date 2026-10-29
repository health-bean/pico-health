import { describe, it, expect } from "vitest";
import { capHistoryByChars } from "./history";

const m = (role: "user" | "assistant", n: number, tag = "") => ({ role, content: tag + "x".repeat(n - tag.length) });

describe("capHistoryByChars", () => {
  it("keeps everything under the cap", () => {
    const h = [m("user", 10), m("assistant", 10), m("user", 10)];
    expect(capHistoryByChars(h, 100)).toEqual(h);
  });

  it("drops the oldest messages until the total fits", () => {
    const h = [m("user", 50, "a"), m("assistant", 50, "b"), m("user", 50, "c"), m("assistant", 50, "d"), m("user", 50, "e")];
    const out = capHistoryByChars(h, 160);
    expect(out.map((x) => x.content[0])).toEqual(["c", "d", "e"]);
  });

  it("never starts the window on an assistant message", () => {
    const h = [m("user", 50, "a"), m("assistant", 50, "b"), m("user", 50, "c")];
    const out = capHistoryByChars(h, 110); // b+c would fit, but b is assistant
    expect(out.map((x) => x.content[0])).toEqual(["c"]);
  });

  it("always keeps the latest message even if it alone exceeds the cap", () => {
    const h = [m("user", 10, "a"), m("assistant", 10, "b"), m("user", 500, "c")];
    expect(capHistoryByChars(h, 100).map((x) => x.content[0])).toEqual(["c"]);
  });

  it("handles empty history", () => {
    expect(capHistoryByChars([], 100)).toEqual([]);
  });
});
