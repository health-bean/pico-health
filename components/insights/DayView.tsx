'use client';

import { useState, useCallback } from 'react';
import { DayHeader } from './DayHeader';
import { JournalSummary } from './JournalSummary';
import { LogSummary } from './LogSummary';
import type { DayComposite } from '@/lib/insights/types';

interface DayViewProps {
  initialDate: string;
  initialComposite: DayComposite | null;
}

export function DayView({ initialDate, initialComposite }: DayViewProps) {
  const [date, setDate] = useState(initialDate);
  const [composite, setComposite] = useState(initialComposite);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const navigate = useCallback(async (newDate: string) => {
    setDate(newDate);
    setLoading(true);
    try {
      const res = await fetch(`/api/insights/day?date=${newDate}`);
      if (res.ok) setComposite(await res.json());
      else setComposite(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const prevDay = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    navigate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    if (date >= today) return;
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    navigate(d.toISOString().split('T')[0]);
  };

  return (
    <div>
      <DayHeader date={date} onPrevious={prevDay} onNext={nextDay} isToday={date === today} />

      {loading ? (
        <div className="py-8 text-center text-warm-400 animate-pulse">Loading...</div>
      ) : composite ? (
        <div className="space-y-3">
          {composite.hasJournal && (
            <JournalSummary journal={composite.journal} />
          )}

          <LogSummary composite={composite} />

          <div className="flex items-center justify-between text-xs text-warm-400 pt-1">
            <span>{composite.entryCount} entries logged</span>
            {composite.compliancePct !== null && (
              <span>{Math.round(composite.compliancePct)}% protocol compliant</span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-warm-400">
          <p className="text-sm">No data for this day.</p>
          <p className="text-xs mt-1">Swipe to browse other days.</p>
        </div>
      )}
    </div>
  );
}
