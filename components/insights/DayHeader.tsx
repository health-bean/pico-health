'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DayHeaderProps {
  date: string;
  onPrevious: () => void;
  onNext: () => void;
  isToday: boolean;
}

export function DayHeader({ date, onPrevious, onNext, isToday }: DayHeaderProps) {
  const d = new Date(date + 'T12:00:00');
  const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-center justify-between py-3">
      <button onClick={onPrevious} className="p-2 rounded-lg hover:bg-warm-100 active:scale-[0.98] transition-all" aria-label="Previous day">
        <ChevronLeft className="w-5 h-5 text-warm-500" />
      </button>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-warm-500" />
        <span className="font-display text-lg text-warm-900">{isToday ? 'Today' : formatted}</span>
      </div>
      <button onClick={onNext} disabled={isToday} className="p-2 rounded-lg hover:bg-warm-100 active:scale-[0.98] transition-all disabled:opacity-30" aria-label="Next day">
        <ChevronRight className="w-5 h-5 text-warm-500" />
      </button>
    </div>
  );
}
