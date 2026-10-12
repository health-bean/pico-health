'use client';

/**
 * Marks a curated row that appeared since the previous insights snapshot.
 * A word, not a chip: as the only filled colour on a row it outranked the
 * evidence chips, so an early signal marked New read louder than a strong
 * finding. Freshness is not trust.
 */
export function NewTag() {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold text-teal-700">
      New
    </span>
  );
}
