'use client';

import { X, Sparkles } from 'lucide-react';
import type { InsightAlert } from '@/lib/insights/types';

interface AlertCardProps {
  alert: InsightAlert;
  onDismiss: (id: string) => void;
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-teal-50 p-3 ring-1 ring-inset ring-teal-200/60">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-teal-900">{alert.title}</p>
        <p className="mt-0.5 text-sm leading-snug text-teal-700">{alert.body}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(alert.id)}
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-teal-500 transition-colors hover:bg-teal-100 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        aria-label={`Dismiss: ${alert.title}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
