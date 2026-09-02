"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Spinner, EmptyState, useToast } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import type { ExtractedEntry } from "@/types";

export function ChatInterface() {
  const { toast } = useToast();
  const removeRef = useRef<(ids: string[]) => void>(() => {});

  const undoSavedEntries = useCallback(
    async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/entries/${id}`, { method: "DELETE" }))
      );
      const removed = ids.filter((_, i) => {
        const r = results[i];
        return r.status === "fulfilled" && (r.value.ok || r.value.status === 404);
      });
      removeRef.current(removed);
      if (removed.length === ids.length) {
        toast(`Removed ${removed.length} ${removed.length === 1 ? "entry" : "entries"}`, "info");
      } else {
        toast("Couldn't remove some entries. Check the Log tab.", "error");
      }
    },
    [toast]
  );

  const handleEntriesSaved = useCallback(
    (entries: ExtractedEntry[]) => {
      const ids = entries.map((e) => e.id).filter((id): id is string => Boolean(id));
      const n = entries.length;
      const message = `Saved ${n} ${n === 1 ? "entry" : "entries"}`;
      if (ids.length === 0) {
        toast(message, "success");
        return;
      }
      toast(message, "success", {
        action: { label: "Undo", onClick: () => void undoSavedEntries(ids) },
      });
    },
    [toast, undoSavedEntries]
  );

  const { messages, loading, sendMessage, loadHistory, removeExtractedEntries } = useChat({
    onEntriesSaved: handleEntriesSaved,
  });
  useEffect(() => {
    removeRef.current = removeExtractedEntries;
  }, [removeExtractedEntries]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadHistory();
    }
  }, [loadHistory]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem-5rem)] flex-col md:h-[calc(100dvh-3.5rem)]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="mx-auto max-w-2xl">
          {messages.length === 0 && !loading ? (
            <div className="pt-20">
              <EmptyState
                icon={<MessageSquare className="h-6 w-6" />}
                title="Start a conversation"
                description="Tell me what you ate, how you feel, or ask about your protocol. I'll track everything for you."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {loading &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-muted)]">
                    <Spinner size="sm" />
                    <span>Thinking...</span>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--color-border-light)] bg-[var(--color-surface-card)] px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <MessageInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
