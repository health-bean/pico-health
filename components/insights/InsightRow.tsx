'use client';

import { ConfidenceTag, type Confidence } from './ConfidenceTag';

interface InsightRowProps {
  icon: string;
  title: string;
  description: string;
  percentage: number;
  foods?: string[];
  isCompound?: boolean;
  confidence?: Confidence;
}

export function InsightRow({ icon, title, description, percentage, foods, isCompound, confidence }: InsightRowProps) {
  const bgClass = isCompound ? 'bg-amber-50/60 border border-amber-100' : 'bg-warm-50';
  const pctColor = percentage >= 60 ? 'text-red-600' : percentage >= 40 ? 'text-amber-600' : 'text-warm-500';

  return (
    <div className={`p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{icon}</span>
            <span className="text-[13px] font-bold text-warm-900">{title}</span>
            {isCompound && (
              <span className="bg-teal-50 text-teal-700 text-[9px] font-bold px-1.5 py-px rounded-full ring-1 ring-inset ring-teal-200/60">
                COMPOUND
              </span>
            )}
            {confidence && <ConfidenceTag confidence={confidence} />}
          </div>
          <p className="text-[13px] text-warm-600 leading-snug">{description}</p>
          {foods && foods.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {foods.map((food, i) => (
                <span key={i} className="bg-warm-100 px-2 py-0.5 rounded-md text-[11px] text-warm-600 ring-1 ring-inset ring-warm-200/60">
                  {food}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className={`text-xl font-bold ${pctColor}`}>{percentage}%</div>
          <div className="text-[10px] text-warm-400">of the time</div>
        </div>
      </div>
    </div>
  );
}
