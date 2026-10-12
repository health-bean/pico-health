import { describe, it, expect } from 'vitest';
import { analyzeTiming } from './timing';
import type { DayComposite } from './types';

const day = (i: number, foods: Array<[string, string]>, symptoms: Array<[string, string | null]>): DayComposite => ({
  userId: 'u1', date: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10),
  foods: foods.map(([name, time]) => ({ foodId: null, name, properties: [], mealType: null, time, protocolStatus: null })),
  symptoms: symptoms.map(([name, time]) => ({ name, severity: 5, time })),
  supplements: [], medications: [], exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: foods.length, symptomCount: symptoms.length, supplementCount: 0, medicationCount: 0,
  exposureCount: 0, exerciseCount: 0, protocolId: null, compliancePct: null, violationCount: 0,
  entryCount: 0, hasJournal: false, isFlareDay: false, hasLateMeal: false,
});

/** 14 days, three meals a day; tomatoes at lunch every other day, hives an hour later each time. */
function acute(symptomTime: (lunch: string) => string): DayComposite[] {
  return Array.from({ length: 14 }, (_, i) => {
    const tomatoes = i % 2 === 0;
    return day(i,
      [['Oatmeal', '08:00'], [tomatoes ? 'Tomatoes' : 'Rice', '12:30'], ['Chicken', '19:00']],
      tomatoes ? [['Hives', symptomTime('12:30')]] : []);
  });
}

describe('meal-level timing', () => {
  it('finds a reaction that follows a food within hours, in two weeks', () => {
    const r = analyzeTiming(acute(() => '13:30')).find(x => x.factor.key === 'food:tomatoes');
    expect(r).toBeDefined();
    expect(r!.basis).toBe('meals');
    expect(r!.frequency).toBe(7);
    expect(r!.description).toBe('Hives came within 4 hours of tomatoes 7 of 7 times. After other meals, 0%.');
  });

  it('ignores a symptom logged at the same moment as the meal: a batch says nothing about order', () => {
    expect(analyzeTiming(acute(t => t))).toHaveLength(0);
  });

  it('ignores a symptom that came before the meal', () => {
    expect(analyzeTiming(acute(() => '10:00')).find(x => x.factor.key === 'food:tomatoes')).toBeUndefined();
  });

  it('ignores a symptom more than four hours later', () => {
    expect(analyzeTiming(acute(() => '17:00')).find(x => x.factor.key === 'food:tomatoes')).toBeUndefined();
  });

  it('does nothing for someone who never logs times', () => {
    const days = acute(() => '13:30').map(d => ({ ...d, foods: d.foods.map(f => ({ ...f, time: null })) }));
    expect(analyzeTiming(days)).toHaveLength(0);
  });
});
