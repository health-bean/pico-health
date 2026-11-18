'use client';

import type { ReactNode } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { StrengthMeter, type Strength } from './StrengthMeter';
import { NewTag } from './NewTag';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  /** Anchor for links from the Log ("See it in Insights"). */
  id?: string;
  /** Briefly outlined when a link from the Log lands on it. */
  highlight?: boolean;
  icon: LucideIcon;
  /** Rendered "<factor> → <outcome>"; without an outcome the factor stands alone. */
  factor: string;
  outcome?: string;
  /** How a screen reader voices the arrow: "then" for symptoms, "with" for what helps. */
  relation?: 'then' | 'with';
  /** The count, in a sentence ("…on 14 of 15 days."). */
  sentence: string;
  /** The rates beside it ("93% of those days, vs 4% of other days"). Never shown without the sentence. */
  compare?: string;
  strength?: Strength;
  isNew?: boolean;
  /** The same cause's other symptoms, in one line ("Also: a flare on 13 of 15 days."). */
  also?: string;
  /** Shown when the same thing is on the other list, so the two cards don't read as a contradiction. */
  note?: string;
  /** A quiet action under the card, e.g. "Add to your list?". */
  action?: ReactNode;
}

/**
 * One finding, one row in its section's tinted panel. The section carries the
 * colour and the meaning; the row carries the count.
 */
export function InsightCard({ id, highlight = false, icon: Icon, factor, outcome, relation = 'then', sentence, compare, strength, isNew, also, note, action }: InsightCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "scroll-mt-24 px-4 py-3 transition-shadow duration-700",
        highlight && "shadow-[inset_0_0_0_3px_var(--color-ochre-500)]"
      )}
    >
      {/* Title and strength share one line; a long title wraps beside the meter. */}
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="inline text-base font-semibold leading-snug text-warm-900">
            {factor}
            {outcome && (
              <>
                <ArrowRight className="mx-1 inline h-3.5 w-3.5 align-[-0.1em] text-warm-500" aria-hidden="true" />
                <span className="sr-only"> {relation} </span>
                {outcome}
              </>
            )}
          </h3>
          {isNew && (
            <span className="ml-2 align-[0.1em]">
              <NewTag />
            </span>
          )}
        </div>
        {strength && (
          <div className="mt-1 shrink-0">
            <StrengthMeter strength={strength} />
          </div>
        )}
      </div>
      {/* The count, then its rates in the same breath, quieter. */}
      <p className="mt-1 max-w-[65ch] pl-7 text-sm leading-snug text-warm-700">
        {sentence}
        {compare && <span className="tabular-nums text-[var(--color-text-muted)]"> {compare.charAt(0).toUpperCase() + compare.slice(1)}.</span>}
      </p>
      {also && <p className="mt-1 max-w-[65ch] pl-7 text-sm leading-snug text-warm-700">{also}</p>}
      {note && <p className="mt-1 max-w-[65ch] pl-7 text-sm text-warm-600">{note}</p>}
      {action && <div className="pl-7">{action}</div>}
    </article>
  );
}
