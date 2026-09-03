import { describe, it, expect } from 'vitest';
import { extractFactorsFromDay } from './single-factor';
import { buildDayComposite } from './day-composite';
import type { DayComposite } from './types';

const makeDay = (foods: DayComposite['foods']): DayComposite => ({
  userId: 'u1', date: '2026-09-03',
  foods, symptoms: [], supplements: [], medications: [], exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: foods.length, symptomCount: 0, supplementCount: 0, medicationCount: 0,
  exposureCount: 0, exerciseCount: 0,
  protocolId: null, compliancePct: null, violationCount: 0,
  entryCount: foods.length, hasJournal: false, isFlareDay: false, hasLateMeal: false,
});

const food = (over: Partial<DayComposite['foods'][number]>) => ({
  foodId: 'f1', name: 'Salmon', properties: [], mealType: 'dinner', time: '19:00', protocolStatus: null, ...over,
});

describe('clarifier answers become insight factors', () => {
  it('emits a quantity factor for more/less but not for usual', () => {
    const more = extractFactorsFromDay(makeDay([food({ quantity: 'more' })]));
    expect(more).toContainEqual({ category: 'quantity', key: 'quantity:more', label: 'Larger portion than usual' });
    const usual = extractFactorsFromDay(makeDay([food({ quantity: 'usual' })]));
    expect(usual.filter(f => f.category === 'quantity')).toEqual([]);
  });

  it('emits one factor per addition, skipping the explicit negatives', () => {
    const factors = extractFactorsFromDay(makeDay([food({ additions: ['garlic', 'neither', 'paprika_chili', 'plain'] })]));
    const adds = factors.filter(f => f.category === 'addition');
    expect(adds).toEqual([
      { category: 'addition', key: 'addition:garlic', label: 'Garlic' },
      { category: 'addition', key: 'addition:paprika_chili', label: 'Paprika / chili' },
    ]);
  });

  it('emits nothing for old rows without the fields', () => {
    const factors = extractFactorsFromDay(makeDay([food({})]));
    expect(factors.filter(f => f.category === 'quantity' || f.category === 'addition')).toEqual([]);
  });

  it('buildDayComposite lifts quantity and additions out of structuredContent', () => {
    const composite = buildDayComposite(
      'u1', '2026-09-03',
      [{
        entryType: 'food', name: 'Salmon', severity: null, entryTime: '19:00', foodId: 'f1', mealType: 'dinner',
        portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null,
        structuredContent: { preparation: ['fresh'], quantity: 'more', additions: ['garlic'] },
      }],
      null, new Map(), null,
    );
    expect(composite.foods[0]).toMatchObject({ preparation: ['fresh'], quantity: 'more', additions: ['garlic'] });
  });
});
