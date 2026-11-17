import { Check, Minus, X } from "lucide-react";
import { FIT_TONE_SYMBOL, type FitTone } from "@/lib/protocols/fit-line";
import { cn } from "@/lib/utils";

const ICONS = { check: Check, minus: Minus, x: X } as const;

/**
 * ✓ Allowed, − Limit, ✕ Avoid: the shape says it even without the colour.
 * Decorative next to the words, so hidden from screen readers.
 */
export function FitSymbol({ tone, className }: { tone: FitTone; className?: string }) {
  const name = FIT_TONE_SYMBOL[tone];
  if (!name) return null;
  const Icon = ICONS[name];
  return <Icon className={cn("h-3 w-3 shrink-0", className)} strokeWidth={2.75} aria-hidden="true" />;
}
