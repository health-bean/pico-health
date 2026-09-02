import { NextResponse } from "next/server";
import { eq, and, asc, desc } from "drizzle-orm";

/** Only the most recent N messages are sent to the model, so long-lived daily conversations stay fast and bounded. */
const CHAT_HISTORY_WINDOW = 40;
import { z } from "zod";
import { db } from "@/lib/db";
import {
  conversations,
  messages,
  profiles,
  protocols,
  protocolRules,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getProvider, runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { tools } from "@/lib/ai/tools";
import { processToolCall } from "@/lib/ai/extract";
import { buildCoachingContext } from "@/lib/coaching/context";
import type { AIMessage } from "@/lib/ai/providers/types";
import { rateLimit, getClientIp, CHAT_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const chatSchema = z.object({
  message: z.string().min(1).max(10_000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = await rateLimit(`chat:${session.userId}:${ip}`, CHAT_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { message, conversationId: incomingConversationId } = parsed.data;

    // ── Conversation: find or create ─────────────────────────────────
    let conversationId = incomingConversationId;

    if (!conversationId) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: session.userId,
          title: message.slice(0, 100),
        })
        .returning({ id: conversations.id });

      conversationId = newConversation.id;
    } else {
      // Verify the conversation belongs to this user
      const [conv] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, session.userId)
          )
        )
        .limit(1);

      if (!conv) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    // ── Save user message ────────────────────────────────────────────
    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        role: "user",
        content: message,
      })
      .returning({ id: messages.id });

    // ── Load conversation history ────────────────────────────────────
    const history = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(CHAT_HISTORY_WINDOW)
      .then((rows) => rows.reverse());

    // ── Build system prompt with user's protocol ─────────────────────
    const [user] = await db
      .select({
        currentProtocolId: profiles.currentProtocolId,
        firstName: profiles.firstName,
      })
      .from(profiles)
      .where(eq(profiles.id, session.userId))
      .limit(1);

    let protocolName: string | undefined;
    let protocolRulesText: string | undefined;

    if (user?.currentProtocolId) {
      const [protocol] = await db
        .select({
          name: protocols.name,
          description: protocols.description,
        })
        .from(protocols)
        .where(eq(protocols.id, user.currentProtocolId))
        .limit(1);

      if (protocol) {
        protocolName = protocol.name;

        const rules = await db
          .select({
            ruleType: protocolRules.ruleType,
            propertyName: protocolRules.propertyName,
            propertyValues: protocolRules.propertyValues,
            status: protocolRules.status,
            notes: protocolRules.notes,
          })
          .from(protocolRules)
          .where(eq(protocolRules.protocolId, user.currentProtocolId))
          .orderBy(asc(protocolRules.ruleOrder));

        if (rules.length > 0) {
          protocolRulesText = rules
            .map((r) => {
              let line = `- ${r.status.toUpperCase()}: ${r.ruleType}`;
              if (r.propertyName) line += ` (${r.propertyName})`;
              if (r.propertyValues && r.propertyValues.length > 0) {
                line += `: ${r.propertyValues.join(", ")}`;
              }
              if (r.notes) line += ` -- ${r.notes}`;
              return line;
            })
            .join("\n");
        }

        if (protocol.description) {
          protocolRulesText =
            `${protocol.description}\n\n${protocolRulesText || ""}`;
        }
      }
    }

    // Build coaching context from user data
    let coachingContext: string | undefined;
    try {
      const ctx = await buildCoachingContext(session.userId);
      if (ctx) coachingContext = ctx;
    } catch (err) {
      log.warn("failed to build coaching context", { error: err as Error });
    }

    const systemPrompt = buildSystemPrompt(protocolName, protocolRulesText, coachingContext);

    // ── Format messages ──────────────────────────────────────────────
    const aiMessages: AIMessage[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // ── Get provider and neutral tools ───────────────────────────────
    const provider = getProvider("daily-chat");
    const neutralTools = toNeutralTools(tools);

    // ── Stream response ──────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          const { text: finalText, extractedEntries } = await runConversationLoop({
            provider,
            systemPrompt,
            messages: aiMessages,
            tools: neutralTools,
            maxRounds: 5,
            maxTokens: 1024,
            toolExecutor: async (name, input) => {
              return processToolCall(name, input, session.userId, userMessage.id);
            },
            onText: (text) => {
              const chunkSize = 50;
              for (let i = 0; i < text.length; i += chunkSize) {
                send({ type: "text", content: text.slice(i, i + chunkSize) });
              }
            },
            onExtracted: (entries) => {
              send({ type: "extracted", entries });
            },
          });

          // ── Save assistant message ───────────────────────────────
          const [assistantMessage] = await db
            .insert(messages)
            .values({
              conversationId: conversationId!,
              role: "assistant",
              content: finalText,
              extractedData:
                extractedEntries.length > 0 ? extractedEntries : null,
            })
            .returning({ id: messages.id });

          // Update conversation timestamp
          await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId!));

          send({
            type: "done",
            messageId: assistantMessage.id,
            conversationId,
          });

          controller.close();
        } catch (error) {
          log.error("AI API error", { error: error as Error });
          send({
            type: "error",
            message: "Something went wrong generating a response.",
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
    log.error("chat route error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
