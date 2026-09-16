'use client';

import { useState } from 'react';
import { PatternCard } from './PatternCard';
import { ProgressCard } from './ProgressCard';
import type { InsightsOutput } from '@/lib/insights/types';

interface AllPatternsProps {
  output: InsightsOutput;
  onBack: () => void;
}

type Tab = 'triggers' | 'helpers' | 'progress';

export function AllPatterns({ output, onBack }: AllPatternsProps) {
  const [tab, setTab] = useState<Tab>('triggers');

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-teal-600 font-medium">
        ← Back to today
      </button>

      <div className="flex gap-2">
        {(['triggers', 'helpers', 'progress'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-teal-100 text-teal-800' : 'text-warm-500 hover:bg-warm-100'
            }`}
          >
            {t === 'triggers' ? `Triggers (${output.triggers.length})` :
             t === 'helpers' ? `Helpers (${output.helpers.length})` :
             `Progress (${output.progress.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tab === 'triggers' && output.triggers.map((r, i) => <PatternCard key={i} result={r} />)}
        {tab === 'helpers' && output.helpers.map((r, i) => <PatternCard key={i} result={r} />)}
        {tab === 'progress' && output.progress.map((o, i) => <ProgressCard key={i} observation={o} />)}

        {tab === 'triggers' && output.triggers.length === 0 && (
          <p className="text-sm text-warm-500 text-center py-6">No trigger patterns found yet. Keep logging.</p>
        )}
        {tab === 'helpers' && output.helpers.length === 0 && (
          <p className="text-sm text-warm-500 text-center py-6">No helper patterns found yet. Keep logging.</p>
        )}
        {tab === 'progress' && output.progress.length === 0 && (
          <p className="text-sm text-warm-500 text-center py-6">Need at least 2 weeks of data for progress observations.</p>
        )}
      </div>

      <div className="text-xs text-warm-500 text-center pt-2">
        {output.dataStatus.daysTracked} days tracked · {output.dataStatus.singleFactors} single-factor · {output.dataStatus.twoFactorPatterns} two-factor · {output.dataStatus.threeFactorPatterns} three-factor
      </div>
    </div>
  );
}
