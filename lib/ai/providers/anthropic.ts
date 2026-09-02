import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIMessage,
  AITool,
  AIResponse,
  AIToolCall,
} from "./types";

// ── Format conversions ──────────────────────────────────────────────────

function toAnthropicMessages(
  msgs: AIMessage[]
): Anthropic.MessageParam[] {
  return msgs.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }

    const blocks: Anthropic.ContentBlockParam[] = m.content.map((part) => {
      switch (part.type) {
        case "text":
          return { type: "text" as const, text: part.text };
        case "image":
          return {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: part.mimeType,
              data: part.imageData.replace(/^data:[^;]+;base64,/, ""),
            },
          };
        case "tool_use":
          return {
            type: "tool_use" as const,
            id: part.id,
            name: part.name,
            input: part.input as Record<string, unknown>,
          };
        case "tool_result":
          return {
            type: "tool_result" as const,
            tool_use_id: part.toolCallId,
            content: part.content,
          };
      }
    });

    return { role: m.role, content: blocks };
  });
}

function toAnthropicTools(tools: AITool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
}

function parseAnthropicResponse(
  response: Anthropic.Message
): AIResponse {
  let text = "";
  const toolCalls: AIToolCall[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }

  const stopReason =
    response.stop_reason === "tool_use"
      ? "tool_use"
      : response.stop_reason === "max_tokens"
        ? "max_tokens"
        : "end_turn";

  return {
    text,
    toolCalls,
    stopReason,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// ── Provider ────────────────────────────────────────────────────────────

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic Claude";

  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel ?? "claude-sonnet-4-20250514";
  }

  async chat(params: {
    model?: string;
    systemPrompt: string;
    messages: AIMessage[];
    tools?: AITool[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: params.model ?? this.defaultModel,
      max_tokens: params.maxTokens ?? 1024,
      system: params.systemPrompt,
      messages: toAnthropicMessages(params.messages),
      ...(params.tools && params.tools.length > 0
        ? { tools: toAnthropicTools(params.tools) }
        : {}),
      ...(params.temperature !== undefined
        ? { temperature: params.temperature }
        : {}),
    });

    return parseAnthropicResponse(response);
  }

  resolveToolResultId(toolCall: AIToolCall): string {
    return toolCall.id;
  }
}
