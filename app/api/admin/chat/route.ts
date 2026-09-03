import { NextResponse } from "next/server";
import { eq, asc, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getProvider, runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { getTaskModel } from "@/lib/ai/router";
import { recordUsage } from "@/lib/ai/usage";
import { buildAdminSystemPrompt } from "@/lib/ai/admin-system-prompt";
import { adminTools } from "@/lib/ai/admin-tools";
import { processAdminToolCall } from "@/lib/ai/admin-extract";
import type { AIMessage } from "@/lib/ai/providers/types";
import { rateLimit, getClientIp, ADMIN_CHAT_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const adminChatSchema = z.object({
  message: z.string().min(1).max(50_000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Rate limit ────────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = await rateLimit(`admin-chat:${session.userId}:${ip}`, ADMIN_CHAT_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = await request.json();
    const parsed = adminChatSchema.safeParse(body);
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
          title: "Admin session",
        })
        .returning({ id: conversations.id });

      conversationId = newConversation.id;
    } else {
      // Verify the conversation belongs to this admin user
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
    await db
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
      .orderBy(asc(messages.createdAt));

    // ── Build system prompt ──────────────────────────────────────────
    const systemPrompt = buildAdminSystemPrompt();

    // ── Format messages ──────────────────────────────────────────────
    const aiMessages: AIMessage[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // ── Get provider and neutral tools ───────────────────────────────
    const provider = getProvider("admin-chat");
    const adminModel = getTaskModel("admin-chat");
    const neutralTools = toNeutralTools(adminTools);

    // ── Stream response ──────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          const { text: finalText, usage } = await runConversationLoop({
            provider,
            model: adminModel,
            systemPrompt,
            messages: aiMessages,
            tools: neutralTools,
            maxRounds: 10,
            maxTokens: 4096,
            toolExecutor: async (name, input) => {
              const result = await processAdminToolCall(name, input);
              // Stream tool result info to client
              send({
                type: "extracted",
                entries: [
                  {
                    entryType: "admin",
                    name,
                    details: result,
                  },
                ],
              });
              return { result };
            },
            onText: (text) => {
              const chunkSize = 50;
              for (let i = 0; i < text.length; i += chunkSize) {
                send({ type: "text", content: text.slice(i, i + chunkSize) });
              }
            },
          });

          // ── Save assistant message ───────────────────────────────
          const [assistantMessage] = await db
            .insert(messages)
            .values({
              conversationId: conversationId!,
              role: "assistant",
              content: finalText,
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

          void recordUsage({ userId: session.userId, task: "admin-chat", provider: "anthropic", model: adminModel, usage });
        } catch (error) {
          log.error("admin AI API error", { error: error as Error });
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
    log.error("admin chat route error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
