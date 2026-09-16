import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variantClasses = {
  allowed: "bg-teal-50 text-teal-700 ring-teal-600/15",
  avoid: "bg-level-3-bg text-level-3-fg ring-level-3-fg/15",
  moderation: "bg-level-2-bg text-level-2-fg ring-level-2-fg/15",
  default: "bg-warm-100 text-warm-700 ring-warm-600/15",
  info: "bg-teal-50 text-teal-700 ring-teal-600/15",
  supplement: "bg-warm-100 text-warm-700 ring-warm-600/15",
} as const;

type BadgeVariant = keyof typeof variantClasses;

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-xs font-medium ring-1 ring-inset",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export type { BadgeProps, BadgeVariant };
