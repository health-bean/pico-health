'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

type SectionVariant = 'trigger' | 'watch' | 'helper';

// Each section carries its own colour, drawn from the brand's warm range:
// clay for what goes with symptoms, gold for what to watch, olive for what
// helps. Warm rather than a red/green traffic light, and the words carry the
// meaning either way.
const variants = {
  trigger: {
    border: 'border-clay-500/20',
    headerBg: 'bg-clay-50',
    headerBorder: 'border-clay-500/20',
    titleColor: 'text-brick-600',
    subtitleColor: 'text-clay-500',
    iconColor: 'text-clay-500',
  },
  watch: {
    border: 'border-gold-400/30',
    headerBg: 'bg-gold-50',
    headerBorder: 'border-gold-400/30',
    titleColor: 'text-warm-900',
    subtitleColor: 'text-warm-700',
    iconColor: 'text-clay-500',
  },
  helper: {
    border: 'border-olive-600/20',
    headerBg: 'bg-olive-50',
    headerBorder: 'border-olive-600/20',
    titleColor: 'text-olive-600',
    subtitleColor: 'text-olive-600',
    iconColor: 'text-olive-600',
  },
};

interface InsightSectionProps {
  variant: SectionVariant;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  defaultVisible?: number;
  totalCount: number;
  /** Bumping this opens the section, so rows added from outside are visible. */
  expandSignal?: number;
  children: React.ReactNode[];
}

export function InsightSection({ variant, icon: Icon, title, subtitle, defaultVisible = 3, totalCount, children, expandSignal = 0 }: InsightSectionProps) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (expandSignal > 0) setShowAll(true);
  }, [expandSignal]);
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
