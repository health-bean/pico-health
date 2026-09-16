'use client';

import type { LucideIcon } from 'lucide-react';
import { ConfidenceTag, type Confidence } from './ConfidenceTag';
import { NewTag } from './NewTag';

interface InsightRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Days the factor and the outcome happened together. */
  days: number;
  /** Days the factor was present at all. */
  total: number;
  foods?: string[];
  isCompound?: boolean;
  confidence?: Confidence;
  isNew?: boolean;
  /** 'symptom' rows describe when a symptom was more common; 'better' rows when it was less common. */
  tone?: 'symptom' | 'better';
  /** Shown when the same thing also appears in the other list, so the two rows do not read as a contradiction. */
  note?: string;
  /** The symptom the count is about, shown with the count so the number never floats free of its meaning. */
  outcome?: string;
}

/**
 * One observation. The number on the right is always the same shape,
 * "14 of 26 days", so it reads as a count and never as a score, and five
 * days can never look like certainty.
 */
export function InsightRow({ icon: Icon, title, description, days, total, foods, isCompound, confidence, isNew, tone = 'symptom', note, outcome }: InsightRowProps) {
  const bgClass = 'bg-warm-50';
  const iconColor = tone === 'better' ? 'text-teal-600' : 'text-warm-600';

  return (
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-1">
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
            <span className="text-sm font-semibold text-warm-900">{title}</span>
            {isCompound && (
              <span className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ring-inset ring-teal-200/60">
                Combination
              </span>
            )}
            {confidence && <ConfidenceTag confidence={confidence} />}
            {isNew && <NewTag />}
          </div>
          <p className="max-w-[65ch] text-sm text-warm-600 leading-snug">{description}</p>
          {note && <p className="mt-1 max-w-[65ch] text-sm text-warm-500">{note}</p>}
          {foods && foods.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {foods.map((food, i) => (
                <span key={i} className="bg-warm-100 px-2 py-0.5 rounded-md text-xs text-warm-600 ring-1 ring-inset ring-warm-200/60">
                  {food}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="max-w-[40%] shrink-0 text-right tabular-nums">
          {outcome && <div className="text-xs font-medium text-warm-600">{outcome}</div>}
          <div className="text-base font-semibold text-warm-900">{days} of {total}</div>
          <div className="text-xs text-warm-500">days</div>
        </div>
      </div>
    </div>
  );
}
