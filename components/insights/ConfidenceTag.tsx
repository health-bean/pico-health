'use client';

export type Confidence = 'early' | 'moderate' | 'strong';

const LABEL: Record<Confidence, string> = {
  early: 'early signal',
  moderate: 'moderate evidence',
  strong: 'strong evidence',
};

/* Confidence is an ordered scale, so it reads as one — rising weight and fill
   on a single neutral, not a change of hue. Colour on these cards belongs to
   the section (clay / gold / olive); a teal chip inside a clay card reads as
   debris from another component, and teal-50 vs teal-100 was never a legible
   step anyway. */
const CLASS: Record<Confidence, string> = {
  early: 'bg-transparent text-warm-500 ring-warm-300/70 font-normal',
  moderate: 'bg-warm-100 text-warm-700 ring-warm-300/70 font-medium',
  strong: 'bg-warm-200 text-warm-900 ring-warm-400/60 font-semibold',
};

/** How much data sits behind a pattern. Observe, don't verdict: an "early signal" is a nudge to keep logging. */
export function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${CLASS[confidence]}`}>
      {LABEL[confidence]}
    </span>
  );
}
