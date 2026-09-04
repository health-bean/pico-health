'use client';

import { ConfidenceTag, type Confidence } from './ConfidenceTag';

interface HelperRowProps {
  icon: string;
  title: string;
  description: string;
  percentage: number;
  confidence?: Confidence;
}

export function HelperRow({ icon, title, description, percentage, confidence }: HelperRowProps) {
  return (
    <div className="p-3 rounded-lg bg-warm-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{icon}</span>
            <span className="text-[13px] font-bold text-warm-900">{title}</span>
            {confidence && <ConfidenceTag confidence={confidence} />}
          </div>
          <p className="text-[13px] text-warm-600 leading-snug">{description}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className="text-xl font-bold text-emerald-600">{percentage}%</div>
          <div className="text-[10px] text-warm-400">of the time</div>
        </div>
      </div>
    </div>
  );
}
