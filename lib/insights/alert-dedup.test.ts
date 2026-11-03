import { describe, it, expect } from 'vitest';
import { withoutAlreadyRaised, PROGRESS_REPEAT_DAYS } from './alerts';

const now = new Date('2026-11-03T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
const pattern = (key: string) => ({ insightKey: key, alertType: 'new_pattern' });
const progress = (key: string) => ({ insightKey: key, alertType: 'progress_milestone' });

describe('withoutAlreadyRaised', () => {
  it('keeps alerts never raised before', () => {
    expect(withoutAlreadyRaised([pattern('a→b')], [], now)).toHaveLength(1);
  });

  it('never raises the same pattern twice, however long ago', () => {
    const out = withoutAlreadyRaised([pattern('a→b')], [{ insightKey: 'a→b', createdAt: daysAgo(200) }], now);
    expect(out).toEqual([]);
  });

  it('raises a progress milestone again only after the repeat window', () => {
    const recent = [{ insightKey: 'progress:headache', createdAt: daysAgo(PROGRESS_REPEAT_DAYS - 1) }];
    const old = [{ insightKey: 'progress:headache', createdAt: daysAgo(PROGRESS_REPEAT_DAYS) }];
    expect(withoutAlreadyRaised([progress('progress:headache')], recent, now)).toEqual([]);
    expect(withoutAlreadyRaised([progress('progress:headache')], old, now)).toHaveLength(1);
  });

  it('uses the latest earlier alert when a key was raised more than once', () => {
    const existing = [
      { insightKey: 'progress:x', createdAt: daysAgo(90) },
      { insightKey: 'progress:x', createdAt: daysAgo(3) },
    ];
    expect(withoutAlreadyRaised([progress('progress:x')], existing, now)).toEqual([]);
  });

  it('drops duplicates within one run', () => {
    expect(withoutAlreadyRaised([pattern('a→b'), pattern('a→b')], [], now)).toHaveLength(1);
  });
});
