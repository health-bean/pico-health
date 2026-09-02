"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Message, ExtractedEntry, ChatStreamEvent } from "@/types";

interface UseChatOptions {
  /** Fired once per assistant turn, after the server has persisted extracted entries. */
  onEntriesSaved?: (entries: ExtractedEntry[]) => void;
}

interface UseChatReturn {
  messages: Message[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: (conversationId?: string) => Promise<void>;
  conversationId: string | null;
  /** Drop extracted-entry cards by timeline id (e.g. after an undo). */
  removeExtractedEntries: (ids: string[]) => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const onEntriesSavedRef = useRef(options.onEntriesSaved);
  useEffect(() => {
    onEntriesSavedRef.current = options.onEntriesSaved;
  }, [options.onEntriesSaved]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (convId?: string) => {
    try {
      const params = convId ? `?conversationId=${convId}` : "";
      const res = await fetch(`/api/chat/history${params}`);

      if (!res.ok) return;

      const data = await res.json();

      if (data.conversation) {
        setConversationId(data.conversation.id);
      }

      if (data.messages) {
        setMessages(
          data.messages.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            conversationId: data.conversation?.id ?? "",
            role: m.role as "user" | "assistant",
            content: m.content as string,
            extractedData: (m.extractedData as ExtractedEntry[] | null) ?? null,
            createdAt: m.createdAt as string,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Optimistic user message
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId ?? "",
        role: "user",
        content,
        extractedData: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setLoading(true);

      // Placeholder for streaming assistant message
      const assistantMsgId = `temp-assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        conversationId: conversationId ?? "",
        role: "assistant",
        content: "",
        extractedData: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, conversationId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error || "Failed to send message"
          );
        }

        // Read NDJSON stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let accumulatedEntries: ExtractedEntry[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event: ChatStreamEvent;
            try {
              event = JSON.parse(line) as ChatStreamEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case "text":
                accumulatedText += event.content ?? "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedText }
                      : m
                  )
                );
                break;

              case "extracted":
                if (event.entries) {
                  accumulatedEntries = [
                    ...accumulatedEntries,
                    ...event.entries,
                  ];
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, extractedData: accumulatedEntries }
                        : m
                    )
                  );
                }
                break;

              case "done": {
                const doneEvent = event as ChatStreamEvent & {
                  messageId?: string;
                  conversationId?: string;
                };
                if (doneEvent.conversationId) {
                  setConversationId(doneEvent.conversationId);
                }
                if (accumulatedEntries.length > 0) {
                  onEntriesSavedRef.current?.(accumulatedEntries);
                }
                // Replace temp IDs with real ones
                if (doneEvent.messageId) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            id: doneEvent.messageId!,
                            conversationId: doneEvent.conversationId ?? m.conversationId,
                          }
                        : m
                    )
                  );
                }
                break;
              }

              case "error":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            event.error ??
                            "Something went wrong. Please try again.",
                        }
                      : m
                  )
                );
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                }
              : m
          )
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [conversationId, loading]
  );

  const removeExtractedEntries = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.extractedData?.some((e) => e.id && idSet.has(e.id))) return m;
        const remaining = m.extractedData.filter((e) => !e.id || !idSet.has(e.id));
        return { ...m, extractedData: remaining.length > 0 ? remaining : null };
      })
    );
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    loadHistory,
    conversationId,
    removeExtractedEntries,
  };
}
