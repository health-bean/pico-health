import { describe, it, expect } from 'vitest';
import { pickCheckinMeal, startedAt, topSymptoms, type LoggedEntry } from './symptom-now';

const at = (h: number, m = 0) => { const d = new Date(2026, 9, 12, h, m); return d; };
const food = (name: string, time: string, mealType = 'lunch'): LoggedEntry => ({ entryType: 'food', name, entryTime: time, mealType });
const never = () => false;

describe('post-meal check-in', () => {
  const lunch = [food('Salmon', '12:40:00'), food('Rice', '12:40:00'), food('Oatmeal', '08:10:00', 'breakfast')];

  it('asks about the latest meal, grouping foods logged together', () => {
    expect(pickCheckinMeal(lunch, at(14, 30), never)).toEqual({ time: '12:40:00', mealType: 'lunch', names: ['Salmon', 'Rice'] });
  });

  it('waits 90 minutes, and stops asking after 4 hours', () => {
    expect(pickCheckinMeal(lunch, at(13, 30), never)).toBeNull();
    expect(pickCheckinMeal(lunch, at(17, 0), never)).toBeNull();
  });

  it('does not ask when a symptom was logged since the meal, or the question was answered', () => {
    expect(pickCheckinMeal([...lunch, { entryType: 'symptom', name: 'Headache', entryTime: '13:30:00' }], at(14, 30), never)).toBeNull();
    expect(pickCheckinMeal(lunch, at(14, 30), t => t === '12:40:00')).toBeNull();
  });

  it('still asks when the only symptom came before the meal', () => {
    expect(pickCheckinMeal([...lunch, { entryType: 'symptom', name: 'Headache', entryTime: '10:00:00' }], at(14, 30), never)).not.toBeNull();
  });

  it('ignores foods with no time', () => {
    expect(pickCheckinMeal([food('Salmon', '')].map(f => ({ ...f, entryTime: null })), at(14, 30), never)).toBeNull();
  });
});

describe('started', () => {
  it('turns "1 h ago" into a time, never before midnight', () => {
    expect(startedAt(at(14, 14), 60)).toBe('13:14:00');
    expect(startedAt(at(0, 20), 120)).toBe('00:00:00');
  });
});

describe('symptoms offered', () => {
  it('uses the person\'s own most-logged symptoms first, then common ones, three in all', () => {
    expect(topSymptoms([
      { entryType: 'food', name: 'Rice', count: 9 },
      { entryType: 'symptom', name: 'Brain fog', count: 2 },
      { entryType: 'symptom', name: 'Bloating', count: 5 },
    ])).toEqual(['Bloating', 'Brain fog', 'Headache']);
    expect(topSymptoms([])).toEqual(['Headache', 'Bloating', 'Fatigue']);
  });
});
