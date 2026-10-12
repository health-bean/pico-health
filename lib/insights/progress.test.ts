import { describe, it, expect } from 'vitest';
import { computeProgress } from './progress';
import type { DayComposite } from './types';

const makeDay = (date: string, overrides: Partial<DayComposite> = {}): DayComposite => ({
  userId: 'u1', date,
  foods: [], symptoms: [], supplements: [], medications: [],
  exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: 0, symptomCount: 0, supplementCount: 0, medicationCount: 0,
  exposureCount: 0, exerciseCount: 0,
  protocolId: null, compliancePct: null, violationCount: 0,
  entryCount: 0, hasJournal: false, isFlareDay: false, hasLateMeal: false,
  ...overrides,
});

describe('computeProgress', () => {
  it('returns empty for less than 14 days', () => {
    const days = Array.from({ length: 10 }, (_, i) => makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`));
    expect(computeProgress(days, '2026-04-10')).toEqual([]);
  });

  it('detects symptom frequency change between periods', () => {
    const days: DayComposite[] = [];
    // March: 6 headache days out of 31
    for (let i = 0; i < 31; i++) {
      days.push(makeDay(`2026-03-${String(i + 1).padStart(2, '0')}`, {
        symptoms: i < 6 ? [{ name: 'Headache', severity: 5, time: null }] : [],
        symptomCount: i < 6 ? 1 : 0,
      }));
    }
    // April: 2 headache days out of 8
    for (let i = 0; i < 8; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`, {
        symptoms: i < 2 ? [{ name: 'Headache', severity: 5, time: null }] : [],
        symptomCount: i < 2 ? 1 : 0,
      }));
    }

    const progress = computeProgress(days, '2026-04-08');
    const headache = progress.find(p => p.metric === 'symptom_frequency:headache');
    expect(headache).toBeDefined();
    expect(headache!.currentPeriod.count).toBe(2);
    expect(headache!.previousPeriod.count).toBe(6);
  });

  it('labels rolling windows as what they are, not calendar months, and counts logged days', () => {
    // 30 logged days, then 10 logged days in the last 30. The old labels
    // called these "Sep" and "so far in Oct" on Oct 12.
    const days: DayComposite[] = [];
    const add = (date: string, headache: boolean) => days.push(makeDay(date, {
      symptoms: headache ? [{ name: 'Headache', severity: 5, time: null }] : [],
    }));
    for (let i = 0; i < 30; i++) add(new Date(Date.UTC(2026, 7, 14 + i)).toISOString().slice(0, 10), i < 8);
    for (let i = 0; i < 10; i++) add(new Date(Date.UTC(2026, 8, 13 + i * 3)).toISOString().slice(0, 10), i < 5);
    const [h] = computeProgress(days, '2026-10-12');
    expect(h.observation).toBe('Headache: 8 of 30 logged days in the 30 before → 5 of 10 logged days in the last 30.');
  });

  it('does not compare when the recent window has too few logged days to say anything', () => {
    const days: DayComposite[] = [];
    for (let i = 0; i < 30; i++) days.push(makeDay(new Date(Date.UTC(2026, 7, 14 + i)).toISOString().slice(0, 10), { symptoms: [{ name: 'Headache', severity: 5, time: null }] }));
    for (let i = 0; i < 6; i++) days.push(makeDay(new Date(Date.UTC(2026, 8, 13 + i * 4)).toISOString().slice(0, 10), { symptoms: [{ name: 'Headache', severity: 5, time: null }] }));
    expect(computeProgress(days, '2026-10-12')).toEqual([]);
  });

  it('never reports a flare-free streak (gamification is an anti-goal)', () => {
    const days = [
      makeDay('2026-04-01', { isFlareDay: true }),
      ...Array.from({ length: 10 }, (_, i) => makeDay(`2026-04-${String(i + 2).padStart(2, '0')}`)),
      ...Array.from({ length: 20 }, (_, i) => makeDay(`2026-03-${String(i + 1).padStart(2, '0')}`)),
    ];
    days.sort((a, b) => a.date.localeCompare(b.date));

    const progress = computeProgress(days, '2026-04-11');
    expect(progress.find(p => p.metric === 'flare_free_streak')).toBeUndefined();
  });
});
