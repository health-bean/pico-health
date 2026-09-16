'use client';

import { cn } from '@/lib/utils';
import { Card, Badge } from '@/components/ui';
import { AlertTriangle, Heart, Zap, TrendingUp } from 'lucide-react';
import type { SingleFactorResult, MultiFactorResult } from '@/lib/insights/types';

type PatternResult = SingleFactorResult | MultiFactorResult;

interface PatternCardProps {
  result: PatternResult;
  variant?: 'trigger' | 'helper' | 'multi-factor';
}

const borderColors = {
  'trigger': 'border-l-red-400',
  'helper': 'border-l-emerald-400',
  'multi-factor': 'border-l-teal-500',
};

const iconBg = {
  'trigger': 'bg-red-50 text-red-600',
  'helper': 'bg-emerald-50 text-emerald-600',
  'multi-factor': 'bg-teal-50 text-teal-600',
};

function getVariant(result: PatternResult): 'trigger' | 'helper' | 'multi-factor' {
  const isMulti = 'factors' in result;
  if (isMulti && (result as MultiFactorResult).factorCount >= 2) return 'multi-factor';
  const factor = isMulti ? (result as MultiFactorResult).factors[0] : (result as SingleFactorResult).factor;
  if (factor.category === 'supplement' || factor.category === 'exercise') return 'helper';
  return 'trigger';
}

function ImpactBar({ score }: { score: number }) {
  const width = Math.min(Math.max(score * 100, 8), 100);
  const color = score >= 0.7 ? 'bg-red-400' : score >= 0.4 ? 'bg-amber-400' : 'bg-warm-300';
  return (
    <div className="h-1 w-16 rounded-full bg-warm-100 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${width}%` }} />
    </div>
  );
}

export function PatternCard({ result, variant: variantOverride }: PatternCardProps) {
  const isMulti = 'factors' in result;
  const factorCount = isMulti ? (result as MultiFactorResult).factorCount : 1;
  const variant = variantOverride ?? getVariant(result);
  const factors = isMulti ? (result as MultiFactorResult).factors : [(result as SingleFactorResult).factor];

  const Icon = variant === 'helper' ? Heart : variant === 'multi-factor' ? Zap : factorCount > 1 ? TrendingUp : AlertTriangle;

  return (
    <Card className={cn('border-l-[3px] overflow-hidden', borderColors[variant])}>
      <div className="flex items-start gap-3 p-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconBg[variant])}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Factor pills for multi-factor */}
          {factorCount >= 2 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {factors.map((f, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200/60">
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-warm-900 leading-snug">{result.description}</p>

          <div className="flex items-center gap-3 mt-2">
            <ImpactBar score={result.impactScore} />
            <span className="text-[11px] text-warm-500">
              {result.frequency} time{result.frequency !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-warm-500">
              {result.recencyDays === 0 ? 'today' : result.recencyDays <= 7 ? `${result.recencyDays}d ago` : `${Math.round(result.recencyDays / 7)}w ago`}
            </span>
            {factorCount >= 2 && (
              <Badge variant="info" className="text-[10px] py-0 px-1.5">
                {factorCount}-factor
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
