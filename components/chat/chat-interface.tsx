"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Spinner, EmptyState, useToast } from "@/components/ui";
import { MessageSquare } from "lucide-react";
import type { ExtractedEntry } from "@/types";

/**
 * Questions a newly diagnosed person actually asks. Chat's job is answering
 * these within the frameworks this audience uses — logging lives on the Log
 * tab. Each is one tap to send.
 */
const STARTERS = [
  "What is histamine intolerance, in plain language?",
  "How does an elimination and reintroduction diet actually work?",
  "Why do leftovers matter for some people?",
  "Is there anything high-histamine in what I ate today?",
  "Why might I have felt off after dinner last night?",
];

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
            <div className="pt-12">
              <EmptyState
                icon={<MessageSquare className="h-6 w-6" />}
                title="Ask about your food, your symptoms, or your protocol"
                description="New to all this? Start anywhere. Logging happens on the Log tab — this is the place to understand what it means."
              />
              <div className="mx-auto mt-2 flex max-w-md flex-col gap-2">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="min-h-11 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-card)] px-4 py-2.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-500 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
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
