"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { QuickLogPanel } from "./quick-log-panel";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after a batch is saved successfully (before the sheet closes). */
  onSaved?: () => void;
  /** YYYY-MM-DD of the day being viewed on Log; entries land on this day. */
  entryDate?: string;
  /** Display label for `entryDate` when it is not today, e.g. "Fri, Apr 24". */
  dayLabel?: string;
}

export function QuickAddSheet({ open, onClose, onSaved, entryDate, dayLabel }: QuickAddSheetProps) {
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

  // A stray backdrop tap or Escape must not throw away picked items, but it
  // must not do nothing silently either: say why the sheet stayed open.
  const [nudge, setNudge] = useState(false);
  const dismiss = useCallback(() => {
    if (hasItems) {
      setNudge(true);
      return;
    }
    close();
  }, [hasItems, close]);
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(false), 4000);
    return () => clearTimeout(t);
  }, [nudge]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Escape, focus trap, and focus in/out: the sheet behaves like a dialog.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => headingRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
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
    // z-[60] sits above the fixed tab bar (z-50), so the sheet's own save
    // button is never covered on a phone.
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        // Fixed height (not max-height) so the sheet's top edge stays put when
        // switching between Food / Symptom / Exercise instead of jumping with
        // each tab's content length.
        className="relative z-10 flex h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-[var(--color-surface-card)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-float)] animate-slide-in-up"
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-warm-300" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h2
            id="quick-add-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold text-warm-900 outline-none"
          >
            {dayLabel ? `Log to ${dayLabel}` : "Find something to log"}
          </h2>
          <button
            type="button"
            onClick={close}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 hover:text-warm-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {nudge && (
          <p role="status" className="mx-4 mb-2 rounded-lg bg-warm-100 px-3 py-2 text-sm text-warm-700">
            Your picks are still here. Log them, or close with the X to discard.
          </p>
        )}

        {/* Content — min-h-0 lets this flex child shrink and actually scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <QuickLogPanel onSaved={handleSaved} onItemsChange={setHasItems} entryDate={entryDate} dayLabel={dayLabel} />
        </div>
      </div>
    </div>
  );
}
