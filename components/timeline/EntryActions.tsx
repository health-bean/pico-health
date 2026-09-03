"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntryAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

interface EntryActionsProps {
  /** Entry name, used for the accessible label. */
  name: string;
  /** Edit-style actions, listed before Delete. */
  actions?: EntryAction[];
  onDelete: () => void;
}

/** Approximate menu height: 44px per item + separator + padding. Used only to decide flip direction. */
const ITEM_H = 44;
const GAP = 4;
/** Keep clear of the docked capture bar / tab bar at the bottom of the viewport. */
const BOTTOM_RESERVED = 120;

type Placement = { top?: number; bottom?: number; right: number };

/**
 * Trailing "..." button on a timeline card. Opens a compact menu anchored to
 * the button with the card's edit actions and Delete. The menu is rendered
 * in a portal with fixed positioning so it is never clipped by card stacking
 * contexts or covered by the docked capture bar, and it flips upward when
 * there is no room below. Deletion is undoable via toast, so no confirm step.
 */
export function EntryActions({ name, actions = [], onDelete }: EntryActionsProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Position relative to the button; flip above if the menu would run into
  // the bottom chrome. Re-measured on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) return;

    function measure() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = (actions.length + 1) * ITEM_H + (actions.length > 0 ? 9 : 0) + 8;
      const spaceBelow = window.innerHeight - BOTTOM_RESERVED - rect.bottom;
      const right = Math.max(8, window.innerWidth - rect.right);
      if (spaceBelow >= estimatedHeight || rect.top < estimatedHeight) {
        setPlacement({ top: rect.bottom + GAP, right });
      } else {
        setPlacement({ bottom: window.innerHeight - rect.top + GAP, right });
      }
    }

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, actions.length]);

  // Close on outside pointer-down or Escape; arrow keys move between items.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
        );
        if (items.length === 0) return;
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(idx + 1) % items.length]
            : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  const itemClass =
    "flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:bg-teal-50";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "-mr-2 -my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 cursor-pointer hover:bg-teal-50 hover:text-teal-600",
          open && "bg-teal-50 text-teal-600"
        )}
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open &&
        placement &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Actions for ${name}`}
            style={placement}
            className={cn(
              "fixed z-[60] min-w-44 overflow-hidden rounded-xl py-1",
              "border border-[var(--color-border-light)] bg-[var(--color-surface-card)] shadow-[var(--shadow-float)]",
              "animate-in fade-in zoom-in-95 duration-150"
            )}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  onClick={() => pick(action.onSelect)}
                  className={cn(itemClass, "text-[var(--color-text-primary)] hover:bg-teal-50")}
                >
                  <Icon className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
                  {action.label}
                </button>
              );
            })}
            {actions.length > 0 && (
              <div className="my-1 border-t border-[var(--color-border-light)]" role="separator" />
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(onDelete)}
              className={cn(itemClass, "text-[var(--color-danger)] hover:bg-red-50")}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
