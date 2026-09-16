'use client';

import type { LucideIcon } from 'lucide-react';
import { ConfidenceTag, type Confidence } from './ConfidenceTag';
import { NewTag } from './NewTag';

interface HelperRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  percentage: number;
  confidence?: Confidence;
  isNew?: boolean;
}

export function HelperRow({ icon: Icon, title, description, percentage, confidence, isNew }: HelperRowProps) {
  return (
    <div className="p-3 rounded-lg bg-warm-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-warm-900">{title}</span>
            {confidence && <ConfidenceTag confidence={confidence} />}
            {isNew && <NewTag />}
          </div>
          <p className="max-w-[65ch] text-sm text-warm-600 leading-snug">{description}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className="text-xl font-semibold tabular-nums text-teal-700">{percentage}%</div>
          <div className="text-xs text-warm-500">of the time</div>
        </div>
      </div>
    </div>
  );
}
