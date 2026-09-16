"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "md",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.classList.add("overflow-hidden");
      document.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element in panel
      requestAnimationFrame(() => {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.[0]?.focus();
      });
    } else {
      document.body.classList.remove("overflow-hidden");
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scrim backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full rounded-2xl bg-[var(--color-surface-card)] shadow-[var(--shadow-float)]",
          "border border-[var(--color-border)]/20",
          "animate-fade-in-up",
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="border-b border-[var(--color-border-light)] px-6 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
          </div>
        )}

        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
