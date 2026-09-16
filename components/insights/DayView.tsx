'use client';

import { useState, useCallback } from 'react';
import { DayHeader } from './DayHeader';
import { JournalSummary } from './JournalSummary';
import { LogSummary } from './LogSummary';
import type { DayComposite } from '@/lib/insights/types';

/** Local calendar date; toISOString() is UTC and shows tomorrow on US evenings. */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DayViewProps {
  initialDate: string;
  initialComposite: DayComposite | null;
}

export function DayView({ initialDate, initialComposite }: DayViewProps) {
  const [date, setDate] = useState(initialDate);
  const [composite, setComposite] = useState(initialComposite);
  const [loading, setLoading] = useState(false);

  const today = localDate(new Date());

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
    navigate(localDate(d));
  };

  const nextDay = () => {
    if (date >= today) return;
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    navigate(localDate(d));
  };

  return (
    <div>
      <DayHeader date={date} onPrevious={prevDay} onNext={nextDay} isToday={date === today} />

      {loading ? (
        <div role="status" className="py-8 text-center text-sm text-warm-500">Loading this day…</div>
      ) : composite ? (
        <div className="space-y-3">
          {composite.hasJournal && (
            <JournalSummary journal={composite.journal} />
          )}

          <LogSummary composite={composite} />

          <p className="pt-1 text-sm text-warm-500">
            {composite.entryCount} {composite.entryCount === 1 ? 'entry' : 'entries'} logged
          </p>
        </div>
      ) : (
        <div className="py-8 text-center text-warm-500">
          <p className="text-sm">Nothing logged this day.</p>
          <p className="mt-1 text-sm">Use the arrows to look at other days.</p>
        </div>
      )}
    </div>
  );
}
