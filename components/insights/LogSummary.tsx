'use client';

import type { DayComposite } from '@/lib/insights/types';
import { FoodPropertyTag } from '@/components/foods/FoodPropertyTag';
import { UtensilsCrossed, Pill, Activity, AlertTriangle, Beaker, Wind } from 'lucide-react';

interface LogSummaryProps {
  composite: DayComposite;
}

export function LogSummary({ composite }: LogSummaryProps) {
  if (composite.entryCount === 0) {
    return (
      <div className="py-8 text-center text-warm-500">
        <p className="font-body">Nothing logged yet today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {composite.foods.map((food, i) => (
        <div key={`food-${i}`} className="flex items-start gap-2 py-1.5">
          <UtensilsCrossed className="w-4 h-4 text-warm-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-warm-900">{food.name}</span>
              {food.time && <span className="text-xs text-warm-500">{food.time}</span>}
              {food.mealType && <span className="text-xs text-warm-500 capitalize">{food.mealType}</span>}
            </div>
            {food.properties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {food.properties.map((p, j) => (
                  <FoodPropertyTag key={j} property={p.property} severity={p.severity} />
                ))}
              </div>
            )}
            {food.protocolStatus === 'avoid' && (
              <span className="inline-block mt-0.5 text-[11px] text-red-600 font-medium">Off-protocol</span>
            )}
          </div>
        </div>
      ))}

      {composite.symptoms.map((s, i) => (
        <div key={`symptom-${i}`} className="flex items-center gap-2 py-1.5">
          <AlertTriangle className="w-4 h-4 text-warm-500 shrink-0" />
          <span className="text-sm text-warm-900">{s.name}</span>
          <span className="text-xs text-warm-500">severity {s.severity}/10</span>
          {s.time && <span className="text-xs text-warm-500">{s.time}</span>}
        </div>
      ))}

      {composite.supplements.map((s, i) => (
        <div key={`supp-${i}`} className="flex items-center gap-2 py-1.5">
          <Pill className="w-4 h-4 text-warm-500 shrink-0" />
          <span className="text-sm text-warm-900">{s.name}</span>
          {s.time && <span className="text-xs text-warm-500">{s.time}</span>}
        </div>
      ))}

      {composite.exercises.map((e, i) => (
        <div key={`exercise-${i}`} className="flex items-center gap-2 py-1.5">
          <Activity className="w-4 h-4 text-warm-500 shrink-0" />
          <span className="text-sm text-warm-900">{e.type} ({e.intensity})</span>
          <span className="text-xs text-warm-500">{e.duration}min</span>
        </div>
      ))}

      {composite.medications.map((m, i) => (
        <div key={`med-${i}`} className="flex items-center gap-2 py-1.5">
          <Beaker className="w-4 h-4 text-warm-500 shrink-0" />
          <span className="text-sm text-warm-900">{m.name}</span>
        </div>
      ))}

      {composite.exposures.map((e, i) => (
        <div key={`exp-${i}`} className="flex items-center gap-2 py-1.5">
          <Wind className="w-4 h-4 text-warm-500 shrink-0" />
          <span className="text-sm text-warm-900">{e.type}</span>
          {e.severity && <span className="text-xs text-warm-500">severity {e.severity}/10</span>}
        </div>
      ))}
    </div>
  );
}
