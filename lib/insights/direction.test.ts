import { describe, it, expect } from 'vitest';
import { analyzeSingleFactors, eligibleDirections, computeConfidence } from './single-factor';
import type { DayComposite } from './types';

const makeDay = (overrides: Partial<DayComposite> = {}): DayComposite => ({
  userId: 'u1', date: '2026-04-01',
  foods: [], symptoms: [], supplements: [], medications: [],
  exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: 0, symptomCount: 0, supplementCount: 0, medicationCount: 0,
  exposureCount: 0, exerciseCount: 0,
  protocolId: null, compliancePct: null, violationCount: 0,
  entryCount: 0, hasJournal: false, isFlareDay: false, hasLateMeal: false,
  ...overrides,
});

const headache = { name: 'Headache', severity: 5, time: null };
const food = (name: string) => ({ foodId: null, name, properties: [], mealType: null, time: null, protocolStatus: null });
const supp = (name: string) => ({ name, time: null });

/** n days of `with` (factor present), m days of `without`, with headache on the given counts. */
function build(opts: { withDays: number; withHeadache: number; withoutDays: number; withoutHeadache: number; factor: 'turmeric' | 'tomato' }) {
  const days: DayComposite[] = [];
  let d = 1;
  const date = () => `2026-05-${String(d++).padStart(2, '0')}`;
  for (let i = 0; i < opts.withDays; i++) {
    const has = i < opts.withHeadache;
    days.push(
      opts.factor === 'turmeric'
        ? makeDay({ date: date(), supplements: [supp('Turmeric')], symptoms: has ? [headache] : [], supplementCount: 1, symptomCount: has ? 1 : 0 })
        : makeDay({ date: date(), foods: [food('Tomato')], symptoms: has ? [headache] : [], foodCount: 1, symptomCount: has ? 1 : 0 })
    );
  }
  for (let i = 0; i < opts.withoutDays; i++) {
    const has = i < opts.withoutHeadache;
    days.push(makeDay({ date: date(), foods: [food('Rice')], symptoms: has ? [headache] : [], foodCount: 1, symptomCount: has ? 1 : 0 }));
  }
  return days;
}

describe('direction is decided by the numbers, not the category', () => {
  it('a supplement with FEWER headaches is a helper, with the denominators in the description', () => {
    // Turmeric: 2 of 10 days (20%). Without: 8 of 12 (67%).
    const results = analyzeSingleFactors(build({ withDays: 10, withHeadache: 2, withoutDays: 12, withoutHeadache: 8, factor: 'turmeric' }));
    const r = results.find(x => x.factor.key === 'supplement:turmeric' && x.outcome.key === 'symptom:headache');
    expect(r?.direction).toBe('decreases');
    expect(r?.rateMultiplier).toBeLessThan(0.8);
    expect(r?.description).toBe('Headache on 2 of 10 days with turmeric (20%), vs 67% of days without.');
  });

  it('a supplement with MORE headaches is not reported as a helper — or at all', () => {
    // Turmeric: 7 of 10 days (70%). Without: 3 of 12 (25%). This is the demo-data turmeric case.
    const results = analyzeSingleFactors(build({ withDays: 10, withHeadache: 7, withoutDays: 12, withoutHeadache: 3, factor: 'turmeric' }));
    const r = results.find(x => x.factor.key === 'supplement:turmeric');
    expect(r).toBeUndefined(); // supplements are not eligible as triggers, and never as false helpers
  });

  it('does not call something a helper for an outcome that is rare anyway (nausea 1% vs 4%)', () => {
    const results = analyzeSingleFactors(build({ withDays: 91, withHeadache: 1, withoutDays: 100, withoutHeadache: 4, factor: 'turmeric' }));
    expect(results.find(x => x.factor.key === 'supplement:turmeric')).toBeUndefined();
  });

  it('a food can be a trigger with honest denominators', () => {
    const results = analyzeSingleFactors(build({ withDays: 10, withHeadache: 7, withoutDays: 12, withoutHeadache: 3, factor: 'tomato' }));
    const r = results.find(x => x.factor.key === 'food:tomato');
    expect(r?.direction).toBe('increases');
    expect(r?.description).toBe('Headache on 7 of 10 days with tomato (70%), vs 25% of other days.');
  });

  it('journal buckets only count in the meaningful direction; "moderate" never counts', () => {
    expect([...eligibleDirections({ category: 'sleep', key: 'sleep:poor', label: 'Poor sleep' })]).toEqual(['increases']);
    expect([...eligibleDirections({ category: 'sleep', key: 'sleep:good', label: 'Good sleep' })]).toEqual(['decreases']);
    expect([...eligibleDirections({ category: 'mood', key: 'mood:moderate', label: 'Moderate mood' })]).toEqual([]);
    expect([...eligibleDirections({ category: 'stress', key: 'stress:high', label: 'High stress' })]).toEqual(['increases']);
    expect([...eligibleDirections({ category: 'supplement', key: 'supplement:x', label: 'X' })]).toEqual(['decreases']);
    expect([...eligibleDirections({ category: 'food_property', key: 'food_property:histamine_high', label: 'High histamine' })]).toEqual(['increases']);
  });
});

describe('evidence gates and ranking', () => {
  it('drops a trigger with only 4 supporting days out of 57 (7%) even though the base rate is 0', () => {
    const results = analyzeSingleFactors(build({ withDays: 57, withHeadache: 4, withoutDays: 30, withoutHeadache: 0, factor: 'tomato' }));
    expect(results.find(x => x.factor.key === 'food:tomato')).toBeUndefined();
  });

  it('keeps a trigger with 4 supporting days when they are most of the factor days', () => {
    const results = analyzeSingleFactors(build({ withDays: 4, withHeadache: 4, withoutDays: 8, withoutHeadache: 0, factor: 'tomato' }));
    const r = results.find(x => x.factor.key === 'food:tomato');
    expect(r?.direction).toBe('increases');
    // Smoothed: (4.5/5)/(0.5/9) → capped at 5, never "infinite".
    expect(r?.rateMultiplier).toBe(5);
  });

  it('ranks 33 supporting days at 2× above 5 days at 5×', () => {
    const many = analyzeSingleFactors(build({ withDays: 74, withHeadache: 33, withoutDays: 60, withoutHeadache: 13, factor: 'tomato' }));
    const few = analyzeSingleFactors(build({ withDays: 5, withHeadache: 5, withoutDays: 60, withoutHeadache: 0, factor: 'tomato' }));
    const a = many.find(x => x.factor.key === 'food:tomato')!;
    const b = few.find(x => x.factor.key === 'food:tomato')!;
    expect(a.impactScore).toBeGreaterThan(b.impactScore);
    expect(a.confidence).toBe('strong');
    expect(b.confidence).toBe('early');
  });

  it('computeConfidence steps with evidence and effect', () => {
    expect(computeConfidence(3, 20)).toBe('strong');
    expect(computeConfidence(1.6, 8)).toBe('moderate');
    expect(computeConfidence(0.3, 15)).toBe('strong'); // protective direction counts the same way
    expect(computeConfidence(4, 4)).toBe('early');
  });
});
