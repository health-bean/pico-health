"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { QuickLogPanel } from "./quick-log-panel";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after a batch is saved successfully (before the sheet closes). */
  onSaved?: () => void;
}

export function QuickAddSheet({ open, onClose, onSaved }: QuickAddSheetProps) {
  // True while the panel has unsaved selected items. Backdrop tap and Escape
  // do nothing in that state so a stray tap can't discard the selection —
  // the X button always closes.
  const [hasItems, setHasItems] = useState(false);

  // The panel unmounts on close, so reset the dirty flag here.
  const close = useCallback(() => {
    setHasItems(false);
    onClose();
  }, [onClose]);

  const handleSaved = useCallback(() => {
    onSaved?.();
    close();
  }, [onSaved, close]);

  const dismiss = useCallback(() => {
    if (hasItems) return;
    close();
  }, [hasItems, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Add"
        // Fixed height (not max-height) so the sheet's top edge stays put when
        // switching between Food / Symptom / Exercise instead of jumping with
        // each tab's content length.
        className="relative z-10 flex h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-[var(--color-surface-card)] shadow-xl"
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-warm-300" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-sm font-semibold text-warm-900">Find something to log</h2>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 hover:bg-warm-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — min-h-0 lets this flex child shrink and actually scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <QuickLogPanel onSaved={handleSaved} onItemsChange={setHasItems} />
        </div>
      </div>
    </div>
  );
}
