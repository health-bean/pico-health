import { describe, it, expect } from 'vitest';
import { localClock, dueReminder, reminderMessage } from './checkin-reminder';
import type { LoggedEntry } from '@/lib/capture/symptom-now';

const lunch: LoggedEntry[] = [
  { entryType: 'food', name: 'Salmon', entryTime: '12:40:00', mealType: 'lunch' },
  { entryType: 'food', name: 'Rice', entryTime: '12:40:00', mealType: 'lunch' },
];
const clock = (h: number, m = 0) => new Date(2000, 0, 1, h, m);

describe('local clock', () => {
  it('reads the person\'s own date and time from a UTC instant', () => {
    // 18:30 UTC on Oct 12 is 14:30 in New York and 03:30 on Oct 13 in Tokyo.
    const now = new Date(Date.UTC(2026, 9, 12, 18, 30));
    const ny = localClock(now, 'America/New_York');
    expect(ny.date).toBe('2026-10-12');
    expect([ny.clock.getHours(), ny.clock.getMinutes()]).toEqual([14, 30]);
    expect(localClock(now, 'Asia/Tokyo').date).toBe('2026-10-13');
  });

  it('falls back to UTC for a time zone it does not recognise', () => {
    expect(localClock(new Date(Date.UTC(2026, 9, 12, 18, 30)), 'Not/AZone').clock.getHours()).toBe(18);
  });
});

describe('who is due a reminder', () => {
  it('reminds 90 minutes to 4 hours after a meal with nothing logged since', () => {
    expect(dueReminder(lunch, clock(14, 30))?.time).toBe('12:40:00');
  });

  it('reminds once per meal', () => {
    const sent = lunch.map(e => ({ ...e, structuredContent: { checkinPushedAt: '2026-10-12T18:15:00Z' } }));
    expect(dueReminder(sent, clock(14, 30))).toBeNull();
  });

  it('never during quiet hours', () => {
    const lateDinner: LoggedEntry[] = [{ entryType: 'food', name: 'Pasta', entryTime: '20:00:00', mealType: 'dinner' }];
    expect(dueReminder(lateDinner, clock(21, 45))).toBeNull();
    expect(dueReminder(lateDinner, clock(21, 30))?.time).toBe('20:00:00');
  });

  it('not once the check-in was answered in the app', () => {
    const answered = lunch.map(e => ({ ...e, structuredContent: { checkin: { answer: 'fine' } } }));
    expect(dueReminder(answered, clock(14, 30))).toBeNull();
  });
});

describe('the message', () => {
  it('names the meal and opens the Log', () => {
    expect(reminderMessage({ time: '12:40:00', mealType: 'lunch', names: ['Salmon', 'Rice'] })).toEqual({
      title: 'How are you since lunch?',
      body: 'Salmon, Rice at 12:40. Tap to answer.',
      url: '/log',
    });
  });
});
