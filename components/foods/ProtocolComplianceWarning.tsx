"use client";

import { Button } from "@/components/ui/button";
import type { Food, Protocol } from "@/types";

interface ProtocolComplianceWarningProps {
  food: Food;
  protocol: Protocol;
  violations: string[];
  onProceed: () => void;
  onCancel: () => void;
}

/**
 * Shown inline when a picked food sits outside the current protocol. It is
 * a note, not a verdict: the product observes, it does not police plates.
 * Logging the food is the useful act; the engine learns from it either way.
 */
export function ProtocolComplianceWarning({
  food,
  protocol,
  violations,
  onProceed,
  onCancel,
}: ProtocolComplianceWarningProps) {
  return (
    <div
      role="status"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4"
    >
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {food.displayName} is outside {protocol.name}
      </p>
      <p className="mt-1 text-sm text-[var(--color-warning)]">
        {violations.join(" · ")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Logging it is the useful part. Days like this are how patterns show up.
      </p>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="md" onClick={onCancel} className="w-full sm:w-auto">
          Pick another
        </Button>
        <Button variant="primary" size="md" onClick={onProceed} className="w-full sm:w-auto">
          Log it anyway
        </Button>
      </div>
    </div>
  );
}
