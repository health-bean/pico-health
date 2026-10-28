import { describe, it, expect, vi } from "vitest";
import { runConversationLoop } from "./conversation-loop";
import type { AIProvider } from "./providers/types";

const toolRound = {
  text: "",
  stopReason: "tool_use",
  toolCalls: [{ id: "t1", name: "log_entries", input: {} }],
  usage: { inputTokens: 100, outputTokens: 10 },
};

function provider(chat: AIProvider["chat"]): AIProvider {
  return { id: "mock", displayName: "Mock", chat, resolveToolResultId: (tc: { id: string }) => tc.id } as unknown as AIProvider;
}

describe("runConversationLoop budget hooks", () => {
  it("reports running usage after every round", async () => {
    const chat = vi.fn().mockResolvedValueOnce(toolRound).mockResolvedValueOnce({ ...toolRound, stopReason: "end_turn", toolCalls: [], text: "ok" });
    const seen: number[] = [];
    await runConversationLoop({
      provider: provider(chat),
      systemPrompt: "",
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      toolExecutor: async () => ({ result: {} }),
      onUsage: (u) => seen.push(u.inputTokens),
    });
    expect(seen).toEqual([100, 200]);
  });

  it("stops before the next round when beforeRound says no", async () => {
    const chat = vi.fn().mockResolvedValue(toolRound);
    const result = await runConversationLoop({
      provider: provider(chat),
      systemPrompt: "",
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      maxRounds: 5,
      toolExecutor: async () => ({ result: {} }),
      beforeRound: (u) => u.inputTokens < 200,
    });
    expect(chat).toHaveBeenCalledTimes(2);
    expect(result.usage.inputTokens).toBe(200);
  });

  it("has already reported usage when a later round throws", async () => {
    const chat = vi.fn().mockResolvedValueOnce(toolRound).mockRejectedValueOnce(Object.assign(new Error("bad"), { status: 400 }));
    let last = 0;
    await expect(
      runConversationLoop({
        provider: provider(chat),
        systemPrompt: "",
        messages: [{ role: "user", content: "hi" }],
        tools: [],
        toolExecutor: async () => ({ result: {} }),
        onUsage: (u) => (last = u.inputTokens),
      })
    ).rejects.toThrow("bad");
    expect(last).toBe(100);
  });
});
