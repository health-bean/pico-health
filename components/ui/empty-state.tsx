import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-500">
        {icon}
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && (
          <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>

      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
