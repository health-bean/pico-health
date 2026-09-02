'use client';

import { cn } from '@/lib/utils';
import { Card, Badge } from '@/components/ui';
import type { PropertyPattern } from '@/lib/insights/types';

interface PropertyPatternCardProps {
  pattern: PropertyPattern;
}

const PROPERTY_ICONS: Record<string, string> = {
  nightshade: '🌶️',
  histamine: '🧪',
  oxalate: '💎',
  fodmap: '🫧',
  lectin: '🫘',
  salicylate: '💊',
  amines: '🧬',
  tyramine: '🧀',
};

export function PropertyPatternCard({ pattern }: PropertyPatternCardProps) {
  const emoji = PROPERTY_ICONS[pattern.property] ?? '🔬';
  const impactColor = pattern.impactScore >= 0.6 ? 'border-l-red-400' : pattern.impactScore >= 0.3 ? 'border-l-amber-400' : 'border-l-warm-300';

  return (
    <Card className={cn('border-l-[3px] overflow-hidden', impactColor)}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-warm-900 capitalize">
                {pattern.severity !== 'high' ? `${pattern.severity} ` : ''}{pattern.property} sensitivity
              </h3>
              <Badge
                variant={pattern.impactScore >= 0.6 ? 'avoid' : pattern.impactScore >= 0.3 ? 'moderation' : 'default'}
              >
                {pattern.frequency} times
              </Badge>
            </div>

            <p className="text-xs text-warm-500 mt-1">{pattern.description}</p>

            {pattern.foods.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {pattern.foods.map((food, i) => (
                  <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-warm-100 text-warm-600 ring-1 ring-inset ring-warm-200/60">
                    {food}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
