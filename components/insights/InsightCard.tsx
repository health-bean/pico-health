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
 * One finding, one card. The section around it carries the colour and the
 * meaning; the card carries the count.
 */
export function InsightCard({ id, highlight = false, icon: Icon, factor, outcome, relation = 'then', sentence, compare, strength, isNew, also, note, action }: InsightCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "scroll-mt-24 rounded-xl border border-warm-200 bg-[var(--color-surface-card)] px-4 py-3.5 transition-shadow duration-700",
        highlight && "shadow-[0_0_0_3px_var(--color-ochre-500)]"
      )}
    >
      {/* Phones: the meter sits under the title so long titles keep the full width. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />
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
        </div>
        {strength && (
          <div className="pl-7 sm:pl-0">
            <StrengthMeter strength={strength} />
          </div>
        )}
      </div>
      <p className="mt-1.5 max-w-[65ch] pl-7 text-sm leading-snug text-warm-700">{sentence}</p>
      {compare && <p className="mt-1 pl-7 text-xs tabular-nums text-[var(--color-text-muted)]">{compare}</p>}
      {also && <p className="mt-1.5 max-w-[65ch] pl-7 text-sm leading-snug text-warm-700">{also}</p>}
      {note && <p className="mt-2 max-w-[65ch] pl-7 text-sm text-warm-600">{note}</p>}
      {action && <div className="pl-7">{action}</div>}
    </article>
  );
}
