import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getProvider, runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { getTaskModel } from "@/lib/ai/router";
import { recordUsage } from "@/lib/ai/usage";
import { tools } from "@/lib/ai/tools";
import { processToolCall } from "@/lib/ai/extract";
import { buildCapturePrompt } from "@/lib/ai/capture-prompt";
import { loadUserProtocolInfo } from "@/lib/ai/user-protocol";
import type { AIMessage, AIContentPart } from "@/lib/ai/providers/types";
import { rateLimit, getClientIp, CHAT_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DATA_URI_RE = /^data:image\/(jpeg|png|webp);base64,/;
/** The capture scribe only logs — no food search, no journal scores. */
const CAPTURE_TOOL_NAMES = new Set(["log_entries", "log_exercise"]);

const captureSchema = z
  .object({
    text: z.string().min(1).max(2000).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    entryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    localTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  })
  .refine((data) => data.text !== undefined || data.imageBase64 !== undefined, {
    message: "Provide text or imageBase64",
  });

/** Decoded byte size of a base64 payload. */
function base64DecodedBytes(payload: string): number {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = await rateLimit(`capture:${session.userId}:${ip}`, CHAT_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    const parsed = captureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { text, imageBase64, entryDate, localTime } = parsed.data;

    // ── Validate image ────────────────────────────────────────────────
    let imageMimeType: "image/jpeg" | "image/png" | "image/webp" | undefined;
    if (imageBase64 !== undefined) {
      const match = imageBase64.match(DATA_URI_RE);
      if (!match) {
        return NextResponse.json(
          { error: "imageBase64 must be a base64 data URI (jpeg, png, or webp)" },
          { status: 400 }
        );
      }
      const payload = imageBase64.slice(imageBase64.indexOf(",") + 1);
      if (base64DecodedBytes(payload) > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image too large (max 6MB)" },
          { status: 400 }
        );
      }
      imageMimeType =
        parsed.data.imageMimeType ??
        (`image/${match[1]}` as "image/jpeg" | "image/png" | "image/webp");
    }

    // ── System prompt (protocol-aware, silent-scribe) ─────────────────
    const today = new Date().toISOString().split("T")[0];
    let protocolName: string | undefined;
    let protocolRulesText: string | undefined;
    try {
      const info = await loadUserProtocolInfo(session.userId);
      protocolName = info.protocolName;
      protocolRulesText = info.protocolRulesText;
    } catch (err) {
      log.warn("capture: failed to load protocol info", { error: err as Error });
    }

    const systemPrompt = buildCapturePrompt({
      today,
      entryDate,
      localTime,
      protocolName,
      protocolRulesText,
    });

    // ── Messages ──────────────────────────────────────────────────────
    let content: string | AIContentPart[];
    if (imageBase64 !== undefined) {
      content = [
        { type: "image", imageData: imageBase64, mimeType: imageMimeType! },
        { type: "text", text: text ?? "Log the food in this photo." },
      ];
    } else {
      content = text!;
    }
    const aiMessages: AIMessage[] = [{ role: "user", content }];

    // ── Provider and tools ────────────────────────────────────────────
    const task = imageBase64 !== undefined ? ("food-photo-parse" as const) : ("capture-extract" as const);
    const provider = getProvider(task);
    const model = getTaskModel(task);
    const neutralTools = toNeutralTools(
      tools.filter((t) => CAPTURE_TOOL_NAMES.has(t.name))
    );

    // ── Stream NDJSON response ────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          const { text: finalText, extractedEntries, usage } = await runConversationLoop({
            provider,
            model,
            systemPrompt,
            messages: aiMessages,
            tools: neutralTools,
            maxRounds: 3,
            maxTokens: 512,
            toolExecutor: async (name, input) => {
              return processToolCall(name, input, session.userId, null);
            },
            onExtracted: (entries) => {
              send({ type: "extracted", entries });
            },
          });

          const note = finalText.trim();
          if (note) {
            send({ type: "note", content: note });
          }

          send({ type: "done", entryCount: extractedEntries.length });
          controller.close();

          void recordUsage({ userId: session.userId, task, provider: "anthropic", model, usage });
        } catch (error) {
          log.error("capture AI error", { error: error as Error });
          send({
            type: "error",
            message: "Something went wrong logging that. Please try again.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    log.error("capture route error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
