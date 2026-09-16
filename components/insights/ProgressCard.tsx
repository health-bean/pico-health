'use client';

import { Card } from '@/components/ui';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { ProgressObservation } from '@/lib/insights/types';

interface ProgressCardProps {
  observation: ProgressObservation;
}

export function ProgressCard({ observation }: ProgressCardProps) {
  const prev = observation.previousPeriod.count;
  const curr = observation.currentPeriod.count;
  const isImproved = curr < prev;
  const isWorse = curr > prev;
  const isStreak = observation.metric === 'flare_free_streak';

  const Icon = isStreak ? TrendingUp : isImproved ? TrendingDown : isWorse ? TrendingUp : Minus;
  const borderColor = isStreak || isImproved ? 'border-l-emerald-400' : isWorse ? 'border-l-amber-400' : 'border-l-warm-300';
  const iconBg = isStreak || isImproved ? 'bg-emerald-50 text-emerald-600' : isWorse ? 'bg-amber-50 text-amber-600' : 'bg-warm-100 text-warm-500';

  return (
    <Card className={`border-l-[3px] ${borderColor}`}>
      <div className="flex items-start gap-3 p-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-warm-900 leading-snug">{observation.observation}</p>
          {!isStreak && prev > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-display text-warm-900">{curr}</span>
                <span className="text-xs text-warm-500">← {prev}</span>
              </div>
              {prev > 0 && (
                <span className={`text-xs font-medium ${isImproved ? 'text-emerald-600' : isWorse ? 'text-amber-600' : 'text-warm-500'}`}>
                  {isImproved ? `↓${Math.round(((prev - curr) / prev) * 100)}%` : isWorse ? `↑${Math.round(((curr - prev) / prev) * 100)}%` : 'no change'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
