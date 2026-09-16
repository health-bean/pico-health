'use client';

import type { LucideIcon } from 'lucide-react';
import { ConfidenceTag, type Confidence } from './ConfidenceTag';
import { NewTag } from './NewTag';

interface InsightRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  percentage: number;
  foods?: string[];
  isCompound?: boolean;
  confidence?: Confidence;
  isNew?: boolean;
}

export function InsightRow({ icon: Icon, title, description, percentage, foods, isCompound, confidence, isNew }: InsightRowProps) {
  const bgClass = isCompound ? 'bg-teal-50/40 border border-teal-100' : 'bg-warm-50';
  const pctColor = percentage >= 60 ? 'text-level-4-fg' : percentage >= 40 ? 'text-level-3-fg' : 'text-warm-600';

  return (
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="h-4 w-4 shrink-0 text-warm-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-warm-900">{title}</span>
            {isCompound && (
              <span className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ring-inset ring-teal-200/60">
                Combination
              </span>
            )}
            {confidence && <ConfidenceTag confidence={confidence} />}
            {isNew && <NewTag />}
          </div>
          <p className="text-sm text-warm-600 leading-snug">{description}</p>
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
        <div className="text-right ml-3 shrink-0">
          <div className={`text-xl font-semibold tabular-nums ${pctColor}`}>{percentage}%</div>
          <div className="text-xs text-warm-500">of the time</div>
        </div>
      </div>
    </div>
  );
}
