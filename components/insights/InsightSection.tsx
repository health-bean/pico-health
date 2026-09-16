'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

type SectionVariant = 'trigger' | 'watch' | 'helper';

// Triggers sit on the level ramp, helpers on the brand hue, watch stays
// neutral: three sections, two hues, no traffic light.
const variants = {
  trigger: {
    border: 'border-warm-200',
    headerBg: 'bg-level-2-bg',
    headerBorder: 'border-level-2-fg/15',
    titleColor: 'text-level-4-fg',
    subtitleColor: 'text-level-3-fg',
    iconColor: 'text-level-3-fg',
  },
  watch: {
    border: 'border-warm-200',
    headerBg: 'bg-warm-100',
    headerBorder: 'border-warm-200',
    titleColor: 'text-warm-900',
    subtitleColor: 'text-warm-600',
    iconColor: 'text-warm-600',
  },
  helper: {
    border: 'border-warm-200',
    headerBg: 'bg-teal-50',
    headerBorder: 'border-teal-200/60',
    titleColor: 'text-teal-900',
    subtitleColor: 'text-teal-700',
    iconColor: 'text-teal-600',
  },
};

interface InsightSectionProps {
  variant: SectionVariant;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  defaultVisible?: number;
  totalCount: number;
  children: React.ReactNode[];
}

export function InsightSection({ variant, icon: Icon, title, subtitle, defaultVisible = 3, totalCount, children }: InsightSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const v = variants[variant];
  const visible = showAll ? children : children.slice(0, defaultVisible);
  const hasMore = totalCount > defaultVisible;

  return (
    <section className={`bg-[var(--color-surface-card)] rounded-xl overflow-hidden shadow-[var(--shadow-card)] border ${v.border}`}>
      <div className={`px-4 py-3 ${v.headerBg} border-b ${v.headerBorder}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${v.iconColor}`} aria-hidden="true" />
          <h2 className={`text-base font-semibold ${v.titleColor}`}>{title}</h2>
        </div>
        <p className={`text-sm ${v.subtitleColor} mt-0.5 ml-6`}>{subtitle}</p>
      </div>
      <div className="p-3 space-y-2">
        {visible}
        {hasMore && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="min-h-11 px-3 text-sm text-teal-600 font-semibold hover:text-teal-700"
            >
              {showAll ? 'Show less' : `Show ${totalCount - defaultVisible} more`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
