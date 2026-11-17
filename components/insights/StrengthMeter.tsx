'use client';

export type Strength = 'early' | 'moderate' | 'strong';

const FILLED: Record<Strength, number> = { early: 1, moderate: 2, strong: 3 };
const WORD: Record<Strength, string> = { early: 'Early', moderate: 'Moderate', strong: 'Strong' };

/**
 * How much evidence sits behind a pattern: three dots and a word, in plain
 * ink. Deliberately colourless. The section heading says whether a pattern
 * goes with symptoms or with better days; a warm fill here read as the Log's
 * "Limit" ochre, i.e. as a warning about the food rather than as "more data".
 * Strength weighs days and the gap against other days, so it is never a
 * percentage.
 */
export function StrengthMeter({ strength }: { strength: Strength }) {
  const filled = FILLED[strength];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-warm-700">
      <svg viewBox="0 0 22 6" className="h-1.5 w-5.5" aria-hidden="true">
        {[3, 11, 19].map((cx, i) =>
          i < filled ? (
            <circle key={cx} cx={cx} cy="3" r="2.5" className="fill-current" />
          ) : (
            <circle key={cx} cx={cx} cy="3" r="2.1" className="fill-none stroke-current" strokeWidth="0.9" />
          )
        )}
      </svg>
      <span>
        {WORD[strength]}
        <span className="sr-only"> evidence</span>
      </span>
    </span>
  );
}
