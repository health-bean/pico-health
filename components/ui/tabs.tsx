"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { ComponentType, KeyboardEvent, SVGProps } from "react";

interface Tab {
  value: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Accessible name for the tab list. */
  label?: string;
}

/**
 * Segmented tabs: one control for every "pick a section" moment. Arrow keys
 * move between tabs, Home/End jump to the ends, and every tab is a 44px
 * target.
 */
export function Tabs({ tabs, value, onChange, className, label }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-xl bg-warm-100 p-1", className)}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.value === value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium",
              "transition-colors duration-200 ease-[var(--ease-out-expo)] cursor-pointer",
              isActive
                ? "bg-[var(--color-surface-card)] text-teal-700 font-semibold shadow-[var(--shadow-card)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export type { TabsProps };
