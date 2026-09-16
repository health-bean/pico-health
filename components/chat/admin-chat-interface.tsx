"use client";

import { useEffect, useRef } from "react";
import { useAdminChat } from "@/hooks/use-admin-chat";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Spinner } from "@/components/ui";
import { ShieldAlert } from "lucide-react";

export function AdminChatInterface() {
  const { messages, loading, sendMessage, loadHistory } = useAdminChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);

  // Load history on mount
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadHistory();
    }
  }, [loadHistory]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem-5rem)] flex-col md:h-[calc(100dvh-3.5rem)]">
      {/* Admin banner */}
      <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm font-medium text-warning-strong">
        <ShieldAlert className="h-4 w-4" />
        <span>Admin Mode &mdash; Changes affect all users&apos; data</span>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning-strong">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-warm-900">
              Data Admin
            </h2>
            <p className="mt-1 max-w-xs text-sm text-warm-500">
              Manage foods, trigger properties, protocols, and reference data.
              Ask me to search, add, update, or delete domain data.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {loading &&
              messages.length > 0 &&
              messages[messages.length - 1]?.role === "assistant" &&
              messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-warm-500">
                  <Spinner size="sm" />
                  <span>Thinking...</span>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-warm-200 bg-[var(--color-surface-card)] px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <MessageInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
