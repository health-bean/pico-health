'use client';

export type Confidence = 'early' | 'moderate' | 'strong';

const LABEL: Record<Confidence, string> = {
  early: 'early signal',
  moderate: 'moderate evidence',
  strong: 'strong evidence',
};

const CLASS: Record<Confidence, string> = {
  early: 'bg-warm-100 text-warm-600 ring-warm-200/60',
  moderate: 'bg-teal-50 text-teal-700 ring-teal-200/60',
  strong: 'bg-teal-100 text-teal-800 ring-teal-300/60',
};

/** How much data sits behind a pattern. Observe, don't verdict: an "early signal" is a nudge to keep logging. */
export function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CLASS[confidence]}`}>
      {LABEL[confidence]}
    </span>
  );
}
