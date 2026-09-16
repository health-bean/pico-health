'use client';

import { X, CircleDot } from 'lucide-react';
import type { InsightAlert } from '@/lib/insights/types';

interface AlertCardProps {
  alert: InsightAlert;
  onDismiss: (id: string) => void;
}

/** Stored alert text carries raw factor keys like "very_high"; read them as words. */
function humanize(text: string): string {
  return text.replace(/_/g, " ");
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const title = humanize(alert.title).replace(/^New pattern: /, '');
  const body = humanize(alert.body);
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-card)] p-3 ring-1 ring-inset ring-warm-200">
      <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-warm-900">{title}</p>
        <p className="mt-0.5 max-w-[65ch] text-sm leading-snug text-warm-600">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(alert.id)}
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-warm-500 transition-colors hover:bg-warm-100 hover:text-warm-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        aria-label={`Dismiss: ${title}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
