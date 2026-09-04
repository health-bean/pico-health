"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Max 4 lines (~96px)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your food, symptoms, or protocol…"
        disabled={disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-xl border border-warm-200 bg-[var(--color-surface-card)] px-4 py-2.5",
          "text-sm text-warm-900 placeholder:text-warm-400",
          "focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[44px] max-h-[96px]"
        )}
      />

      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          "bg-teal-600 text-white",
          "transition-colors duration-150",
          "hover:bg-teal-700 active:bg-teal-800",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
        aria-label="Send message"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
