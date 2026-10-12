import { describe, it, expect } from 'vitest';
import { computeWatching } from './assemble';
import type { DayComposite } from './types';

const day = (i: number, foods: string[], symptoms: string[]): DayComposite => ({
  userId: 'u1', date: `2026-09-${String(i + 1).padStart(2, '0')}`,
  foods: foods.map(name => ({ foodId: null, name, properties: [], mealType: null, time: null, protocolStatus: null })),
  symptoms: symptoms.map(name => ({ name, severity: 5, time: null })),
  supplements: [], medications: [], exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: 0, symptomCount: 0, supplementCount: 0, medicationCount: 0, exposureCount: 0, exerciseCount: 0,
  protocolId: null, compliancePct: null, violationCount: 0, entryCount: 0, hasJournal: false, isFlareDay: false, hasLateMeal: false,
});

describe('what is being watched', () => {
  it('counts days, not entries, and says only whether there is enough to check', () => {
    const w = computeWatching([
      day(0, ['Oatmeal', 'Oatmeal', 'Tomatoes'], ['Bloating', 'bloating']),
      day(1, ['Oatmeal'], []),
      day(2, ['Oatmeal', 'Tomatoes'], ['Bloating']),
    ]);
    expect(w.foods).toEqual([
      { label: 'Oatmeal', days: 3, checkable: true },
      { label: 'Tomatoes', days: 2, checkable: false },
    ]);
    expect(w.symptoms).toEqual([{ label: 'Bloating', days: 2, checkable: false }]);
    expect(w.minDays).toBe(3);
  });
});
