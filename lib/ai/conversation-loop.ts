import type {
  AIProvider,
  AITool,
  AIMessage,
  AIContentPart,
  AIToolUsePart,
  AIToolResultPart,
  AITextPart,
} from "./providers/types";

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const RETRY_DELAYS_MS = [500, 1500];

function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (e?.status && RETRYABLE_STATUS.has(e.status)) return true;
  return /overloaded|rate limit|429|529|ECONNRESET|fetch failed/i.test(e?.message ?? "");
}

/** Retry transient provider failures (429/5xx/overloaded) with a short backoff. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === RETRY_DELAYS_MS.length || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
}

interface ToolExecutorResult {
  result: unknown;
  entries?: unknown[];
}

interface ConversationLoopParams {
  provider: AIProvider;
  systemPrompt: string;
  messages: AIMessage[];
  tools: AITool[];
  toolExecutor: (name: string, input: unknown) => Promise<ToolExecutorResult>;
  maxRounds?: number;
  maxTokens?: number;
  model?: string;
  /** Called whenever the provider returns text. */
  onText?: (text: string) => void;
  /** Called whenever a tool produces extracted entries. */
  onExtracted?: (entries: unknown[]) => void;
}

interface ConversationLoopResult {
  text: string;
  extractedEntries: unknown[];
  /** Token totals summed across every round of the loop. */
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
  };
}

/**
 * Run a multi-round conversation loop with tool calling.
 *
 * This is provider-agnostic: it takes an AIProvider, sends messages,
 * executes tools, feeds results back, and repeats until the model
 * produces a final text response (or we hit maxRounds).
 */
export async function runConversationLoop(
  params: ConversationLoopParams
): Promise<ConversationLoopResult> {
  const {
    provider,
    systemPrompt,
    tools,
    toolExecutor,
    maxRounds = 5,
    maxTokens,
    model,
    onText,
    onExtracted,
  } = params;

  const currentMessages: AIMessage[] = [...params.messages];
  const allExtractedEntries: unknown[] = [];
  let finalText = "";
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };

  for (let round = 0; round < maxRounds; round++) {
    const response = await withRetry(() =>
      provider.chat({
        model,
        systemPrompt,
        messages: currentMessages,
        tools,
        maxTokens,
      })
    );

    if (response.usage) {
      usage.inputTokens += response.usage.inputTokens;
      usage.outputTokens += response.usage.outputTokens;
      usage.cacheReadInputTokens += response.usage.cacheReadInputTokens ?? 0;
      usage.cacheCreationInputTokens += response.usage.cacheCreationInputTokens ?? 0;
    }

    // Accumulate text
    if (response.text) {
      finalText += response.text;
      onText?.(response.text);
    }

    // No tool calls → done
    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) {
      break;
    }

    // Build the assistant message with text + tool_use parts
    const assistantParts: AIContentPart[] = [];
    if (response.text) {
      assistantParts.push({ type: "text", text: response.text } as AITextPart);
    }
    for (const tc of response.toolCalls) {
      assistantParts.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      } as AIToolUsePart);
    }
    currentMessages.push({ role: "assistant", content: assistantParts });

    // Execute each tool and collect results
    const toolResultParts: AIToolResultPart[] = [];

    for (const tc of response.toolCalls) {
      const { result, entries } = await toolExecutor(tc.name, tc.input);

      if (entries && entries.length > 0) {
        allExtractedEntries.push(...entries);
        onExtracted?.(entries);
      }

      toolResultParts.push({
        type: "tool_result",
        toolCallId: provider.resolveToolResultId(tc),
        content: JSON.stringify(result),
      });
    }

    // Feed tool results back as a user message
    currentMessages.push({ role: "user", content: toolResultParts });
  }

  return { text: finalText, extractedEntries: allExtractedEntries, usage };
}
