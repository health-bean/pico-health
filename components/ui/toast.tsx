"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** Optional inline action (e.g. "Undo"). Clicking it dismisses the toast. */
  action?: ToastAction;
  /** Auto-dismiss delay in ms. Defaults to 5000, or 10000 when an action is present. Paused while hovered or focused. */
  duration?: number;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-teal-600 text-white",
  error: "bg-danger text-white",
  info: "bg-warm-700 text-white",
};

let toastCounter = 0;

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const remainingRef = useRef(t.duration);
  const startedRef = useRef(0);

  // The timer pauses while the toast is hovered or has focus, so a slow tap
  // or a keyboard user reaching Undo never loses the chance to use it.
  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startedRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismiss(t.id), remainingRef.current);
  }, [onDismiss, t.id]);
  const pause = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(1500, remainingRef.current - (Date.now() - startedRef.current));
  }, []);

  useEffect(() => {
    start();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [start]);

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) start();
      }}
      className={cn(
        "flex items-center gap-2 rounded-xl py-1.5 pl-4 pr-1.5 text-sm font-medium shadow-[var(--shadow-elevated)]",
        "animate-slide-in-right",
        variantClasses[t.variant]
      )}
    >
      <span className="flex-1">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.onClick();
            onDismiss(t.id);
          }}
          className="shrink-0 min-h-11 rounded-lg bg-white/15 px-3.5 text-sm font-semibold hover:bg-white/25 transition-colors cursor-pointer"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info", options?: ToastOptions) => {
      const id = `toast-${++toastCounter}`;
      const duration = options?.duration ?? (options?.action ? 10000 : 5000);
      setToasts((prev) => [...prev, { id, message, variant, action: options?.action, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* One persistent live region, so every toast is announced reliably.
          On phones it sits above the capture bar stack, not over it. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[55] flex flex-col gap-2 md:bottom-auto md:left-auto md:top-4 md:w-80"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
