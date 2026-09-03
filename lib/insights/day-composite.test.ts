import { describe, it, expect } from 'vitest';
import { buildDayComposite, isFlareDay, hasLateMeal } from './day-composite';

describe('isFlareDay', () => {
  it('returns true when ≥2 symptoms', () => {
    expect(isFlareDay([
      { name: 'Headache', severity: 3, time: null },
      { name: 'Fatigue', severity: 2, time: null },
    ])).toBe(true);
  });

  it('returns true when any severity ≥7', () => {
    expect(isFlareDay([
      { name: 'Headache', severity: 8, time: null },
    ])).toBe(true);
  });

  it('returns false for single mild symptom', () => {
    expect(isFlareDay([
      { name: 'Headache', severity: 3, time: null },
    ])).toBe(false);
  });

  it('returns false for empty symptoms', () => {
    expect(isFlareDay([])).toBe(false);
  });
});

describe('hasLateMeal', () => {
  it('returns true for food after 20:00', () => {
    expect(hasLateMeal([{ foodId: null, name: 'Pizza', properties: [], mealType: null, time: '21:30', protocolStatus: null }])).toBe(true);
  });

  it('returns false for food before 20:00', () => {
    expect(hasLateMeal([{ foodId: null, name: 'Lunch', properties: [], mealType: null, time: '12:00', protocolStatus: null }])).toBe(false);
  });

  it('returns false when no time recorded', () => {
    expect(hasLateMeal([{ foodId: null, name: 'Lunch', properties: [], mealType: null, time: null, protocolStatus: null }])).toBe(false);
  });
});

describe('buildDayComposite', () => {
  it('aggregates entries and journal into a composite', () => {
    const entries = [
      { entryType: 'food', name: 'Eggs', severity: null, entryTime: '08:00', foodId: 'f1', mealType: 'breakfast', portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null },
      { entryType: 'symptom', name: 'Headache', severity: 5, entryTime: '14:00', foodId: null, mealType: null, portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null },
      { entryType: 'supplement', name: 'Magnesium', severity: null, entryTime: '20:00', foodId: null, mealType: null, portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null },
    ];
    const journal = { sleepScore: 6, energyScore: 5, moodScore: 7, stressScore: 4, painScore: 3 };
    const foodProperties = new Map([['f1', [{ property: 'histamine', severity: 'moderate' }]]]);

    const composite = buildDayComposite('user1', '2026-04-11', entries, journal, foodProperties, null);

    expect(composite.foodCount).toBe(1);
    expect(composite.symptomCount).toBe(1);
    expect(composite.supplementCount).toBe(1);
    expect(composite.foods[0].name).toBe('Eggs');
    expect(composite.foods[0].properties).toEqual([{ property: 'histamine', severity: 'moderate' }]);
    expect(composite.symptoms[0].severity).toBe(5);
    expect(composite.journal.sleep).toBe(6);
    expect(composite.hasJournal).toBe(true);
    expect(composite.isFlareDay).toBe(false);
    expect(composite.entryCount).toBe(3);
  });

  it('detects flare day from composite entries', () => {
    const entries = [
      { entryType: 'symptom', name: 'Headache', severity: 8, entryTime: null, foodId: null, mealType: null, portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null },
    ];

    const composite = buildDayComposite('user1', '2026-04-11', entries, null, new Map(), null);
    expect(composite.isFlareDay).toBe(true);
    expect(composite.hasJournal).toBe(false);
  });

  it('carries preparation states from structuredContent into food entries', () => {
    const entries = [
      { entryType: 'food', name: 'Chicken', severity: null, entryTime: '19:00', foodId: null, mealType: 'dinner', portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null, structuredContent: { preparation: ['leftover'] } },
      { entryType: 'food', name: 'Sauerkraut', severity: null, entryTime: '19:00', foodId: null, mealType: 'dinner', portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null, structuredContent: { details: 'small serving', preparation: ['fermented'] } },
      { entryType: 'food', name: 'Apple', severity: null, entryTime: '10:00', foodId: null, mealType: 'snack', portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null },
    ];

    const composite = buildDayComposite('user1', '2026-09-01', entries, null, new Map(), null);
    expect(composite.foods[0].preparation).toEqual(['leftover']);
    expect(composite.foods[1].preparation).toEqual(['fermented']);
    expect(composite.foods[2].preparation).toEqual([]);
  });

  it('ignores malformed preparation values in structuredContent', () => {
    const entries = [
      { entryType: 'food', name: 'Soup', severity: null, entryTime: null, foodId: null, mealType: null, portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null, structuredContent: { preparation: 'leftover' } },
      { entryType: 'food', name: 'Stew', severity: null, entryTime: null, foodId: null, mealType: null, portion: null, exerciseType: null, durationMinutes: null, intensityLevel: null, energyLevel: null, structuredContent: { preparation: ['leftover', 42, null] } },
    ];

    const composite = buildDayComposite('user1', '2026-09-01', entries, null, new Map(), null);
    expect(composite.foods[0].preparation).toEqual([]);
    expect(composite.foods[1].preparation).toEqual(['leftover']);
  });

  it('handles exercise entries', () => {
    const entries = [
      { entryType: 'exercise', name: 'Running', severity: null, entryTime: '07:00', foodId: null, mealType: null, portion: null, exerciseType: 'cardio', durationMinutes: 30, intensityLevel: 'moderate', energyLevel: 7 },
    ];

    const composite = buildDayComposite('user1', '2026-04-11', entries, null, new Map(), null);
    expect(composite.exerciseCount).toBe(1);
    expect(composite.exercises[0].type).toBe('cardio');
    expect(composite.exercises[0].duration).toBe(30);
    expect(composite.exercises[0].energyLevel).toBe(7);
  });
});
