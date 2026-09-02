'use client';

import { useState } from 'react';

type SectionVariant = 'trigger' | 'watch' | 'helper';

const variants = {
  trigger: {
    border: 'border-red-200',
    headerBg: 'bg-red-50',
    headerBorder: 'border-red-200',
    titleColor: 'text-red-900',
    subtitleColor: 'text-red-700',
  },
  watch: {
    border: 'border-amber-200',
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-200',
    titleColor: 'text-amber-900',
    subtitleColor: 'text-amber-700',
  },
  helper: {
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-emerald-200',
    titleColor: 'text-emerald-900',
    subtitleColor: 'text-emerald-700',
  },
};

interface InsightSectionProps {
  variant: SectionVariant;
  icon: string;
  title: string;
  subtitle: string;
  defaultVisible?: number;
  totalCount: number;
  children: React.ReactNode[];
}

export function InsightSection({ variant, icon, title, subtitle, defaultVisible = 3, totalCount, children }: InsightSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const v = variants[variant];
  const visible = showAll ? children : children.slice(0, defaultVisible);
  const hasMore = totalCount > defaultVisible;

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm border ${v.border}`}>
      <div className={`px-4 py-3 ${v.headerBg} border-b ${v.headerBorder}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className={`text-[15px] font-bold ${v.titleColor}`}>{title}</h3>
        </div>
        <p className={`text-xs ${v.subtitleColor} mt-0.5 ml-7`}>{subtitle}</p>
      </div>
      <div className="p-3 space-y-2">
        {visible}
        {hasMore && (
          <div className="text-center pt-1">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-teal-600 font-semibold hover:text-teal-700"
            >
              {showAll ? 'Show less' : `Show ${totalCount - defaultVisible} more ↓`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
