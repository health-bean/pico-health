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
  /** Auto-dismiss delay in ms. Defaults to 4000, or 6000 when an action is present. */
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
  error: "bg-red-600 text-white",
  info: "bg-warm-700 text-white",
};

let toastCounter = 0;

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(t.id);
    }, t.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-[var(--shadow-elevated)]",
        "animate-in slide-in-from-right fade-in duration-300",
        variantClasses[t.variant]
      )}
    >
      <span className="flex-1">{t.message}</span>
      {t.action && (
        <button
          onClick={() => {
            t.action?.onClick();
            onDismiss(t.id);
          }}
          className="shrink-0 -my-1 min-h-[36px] rounded-lg bg-white/15 px-3 text-sm font-semibold hover:bg-white/25 transition-colors cursor-pointer"
        >
          {t.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded-lg p-0.5 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
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
      const duration = options?.duration ?? (options?.action ? 6000 : 4000);
      setToasts((prev) => [...prev, { id, message, variant, action: options?.action, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 md:bottom-auto md:left-auto md:top-4 md:w-80">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
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
