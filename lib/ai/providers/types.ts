/**
 * Provider-neutral AI types.
 *
 * Every provider (Anthropic, Gemini, OpenAI, …) implements the AIProvider
 * interface. The rest of the app talks exclusively through these types.
 */

// ── Task identifiers ────────────────────────────────────────────────────

export type AITask =
  | "daily-chat"          // Conversational tracking, food parsing from text
  | "food-photo-parse"    // Vision: parse food from a photo
  | "admin-chat"          // Admin data management chat
  | "health-insights"     // Deep pattern analysis, insight reports
  | "protocol-reasoning"; // Complex reasoning about protocol compliance

// ── Messages ────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "user" | "assistant";
  content: string | AIContentPart[];
}

export type AIContentPart =
  | AITextPart
  | AIImagePart
  | AIToolUsePart
  | AIToolResultPart;

export interface AITextPart {
  type: "text";
  text: string;
}

export interface AIImagePart {
  type: "image";
  /** base64 data URI or URL */
  imageData: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface AIToolUsePart {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface AIToolResultPart {
  type: "tool_result";
  toolCallId: string;
  content: string;
}

// ── Tools ───────────────────────────────────────────────────────────────

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

// ── Responses ───────────────────────────────────────────────────────────

export interface AIToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface AIResponse {
  text: string;
  toolCalls: AIToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

// ── Provider contract ───────────────────────────────────────────────────

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;

  chat(params: {
    model?: string;
    systemPrompt: string;
    messages: AIMessage[];
    tools?: AITool[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<AIResponse>;

  /**
   * Return the ID to use in a tool_result message for a given tool call.
   * Most providers use the tool call's `id`; Gemini uses the function `name`.
   */
  resolveToolResultId(toolCall: AIToolCall): string;
}
