import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageTitleProps {
  children: ReactNode;
  className?: string;
  /** Rendered element; h1 for the page's own title, h2 for a step inside a flow. */
  as?: "h1" | "h2";
}

/**
 * The one display-face title role. Every screen's name is set the same way
 * so a person always knows where they are before reading anything else.
 */
export function PageTitle({ children, className, as: Tag = "h1" }: PageTitleProps) {
  return (
    <Tag
      className={cn(
        "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] text-balance",
        className
      )}
    >
      {children}
    </Tag>
  );
}
