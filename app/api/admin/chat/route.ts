import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getProvider, runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { getTaskModel } from "@/lib/ai/router";
import { recordUsage, keepAliveUntil } from "@/lib/ai/usage";
import { capHistoryByChars, ADMIN_CHAT_HISTORY_MAX_CHARS } from "@/lib/ai/history";
import type { TokenTotals } from "@/lib/billing/quota";
import { buildAdminSystemPrompt } from "@/lib/ai/admin-system-prompt";
import { adminTools } from "@/lib/ai/admin-tools";
import { processAdminToolCall } from "@/lib/ai/admin-extract";
import type { AIMessage } from "@/lib/ai/providers/types";
import { rateLimit, ADMIN_CHAT_RATE_LIMIT } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { readJson, uuidString } from "@/lib/api/validation";

/** Admin sessions can be long; bound what each turn re-sends to the model. */
const ADMIN_CHAT_HISTORY_WINDOW = 60;

const adminChatSchema = z.object({
  message: z.string().min(1).max(50_000),
  conversationId: uuidString().optional(),
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

    // ── Rate limit (per user; admins are exempt from tier limits, not this) ──
    const rl = await rateLimit(`admin-chat:${session.userId}`, ADMIN_CHAT_RATE_LIMIT, { strict: true });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = await readJson(request);
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
      .orderBy(desc(messages.createdAt))
      .limit(ADMIN_CHAT_HISTORY_WINDOW)
      .then((rows) => capHistoryByChars(rows.reverse(), ADMIN_CHAT_HISTORY_MAX_CHARS));

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
    const usageRecorded = keepAliveUntil();
    let usageSoFar: TokenTotals | undefined;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: object) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            // Client disconnected; keep going so usage is recorded.
          }
        };

        try {
          const { text: finalText } = await runConversationLoop({
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
            onUsage: (u) => {
              usageSoFar = u;
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
        } catch (error) {
          log.error("admin AI API error", { error: error as Error });
          send({
            type: "error",
            message: "Something went wrong generating a response.",
          });
        } finally {
          await recordUsage({ userId: session.userId, task: "admin-chat", provider: provider.id, model: adminModel, usage: usageSoFar });
          usageRecorded();
          try {
            controller.close();
          } catch {
            // already closed by a disconnected client
          }
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
