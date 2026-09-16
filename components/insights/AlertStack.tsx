'use client';

import { useState } from 'react';
import { AlertCard } from './AlertCard';
import type { InsightAlert } from '@/lib/insights/types';

const DEFAULT_VISIBLE = 3;

interface AlertStackProps {
  alerts: InsightAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Recent alerts that are not already represented as a curated row above.
 * Newest first, three at a time; everything else sits behind "Show more".
 */
export function AlertStack({ alerts, onDismiss, onClearAll }: AlertStackProps) {
  const [showAll, setShowAll] = useState(false);
  if (alerts.length === 0) return null;

  const visible = showAll ? alerts : alerts.slice(0, DEFAULT_VISIBLE);
  const hidden = alerts.length - visible.length;

  return (
    <section aria-labelledby="alerts-heading">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="alerts-heading" className="text-sm font-semibold text-warm-700">
          New since your last visit
        </h2>
        <button
          type="button"
          onClick={onClearAll}
          className="-mr-2 min-h-11 px-2 text-sm font-medium text-teal-600 transition-colors hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {visible.map(alert => (
          <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </div>
      {alerts.length > DEFAULT_VISIBLE && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            className="min-h-11 px-3 text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          >
            {showAll ? 'Show less' : `Show ${hidden} more`}
          </button>
        </div>
      )}
    </section>
  );
}
