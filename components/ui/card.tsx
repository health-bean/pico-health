import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  /** Remove default padding for custom layouts */
  noPadding?: boolean;
}

export function Card({ children, header, className, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--color-surface-card)]",
        "border border-[var(--color-border)]/20 shadow-[var(--shadow-card)]",
        "transition-shadow duration-200 ease-[var(--ease-out-expo)]",
        className
      )}
    >
      {header && (
        <div className="border-b border-[var(--color-border-light)] px-5 py-4">
          {typeof header === "string" ? (
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-text-primary)]">
              {header}
            </h2>
          ) : (
            header
          )}
        </div>
      )}

      <div className={noPadding ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}
