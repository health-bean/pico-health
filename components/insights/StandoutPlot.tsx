'use client';

export interface StandoutDatum {
  /** What was logged — a food, a property, a late meal, a cycle phase. */
  factor: string;
  /** The symptom or day-level outcome this is measured against. */
  outcome: string;
  /** How often the outcome landed on days with the factor (0–1). */
  withRate: number;
  /** The rate it is measured against (0–1). */
  otherRate: number;
  /**
   * What that comparison actually is. A single factor is compared against
   * every other day; a combination is compared against the best either factor
   * managed alone, which is a different question and has to say so.
   */
  otherLabel: string;
  days: number;
  total: number;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The page's lead. Three findings on one shared 0–100% scale, each drawn as a
 * pair of dots: the rate on days with the factor, and the rate on every other
 * day. The distance between them is the finding, which a sentence buries and a
 * position reads instantly — and the shared axis lets the three be compared to
 * each other, which nothing on the page could do before.
 *
 * One hue in two shades, not two colours: these are the same measurement under
 * two conditions, not two categories. Direction is carried by which dot sits
 * further right, so nothing here has to be coloured good or bad.
 */
export function StandoutPlot({ items }: { items: StandoutDatum[] }) {
  if (items.length === 0) return null;

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <span className="text-sm text-warm-600">
          How often each symptom turned up, with and without
        </span>
        <span className="flex items-center gap-4 text-xs text-warm-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-700" aria-hidden="true" />
            With it
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-400" aria-hidden="true" />
            Without it
          </span>
        </span>
      </figcaption>

      <div className="mt-5 space-y-6">
        {items.map((d, i) => {
          const lo = Math.min(d.withRate, d.otherRate);
          const hi = Math.max(d.withRate, d.otherRate);
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-sm">
                  <span className="font-semibold text-warm-900">{d.factor}</span>
                  <span className="text-warm-600"> · {d.outcome.toLowerCase()}</span>
                </p>
                <p className="shrink-0 text-sm font-semibold text-warm-900 tabular-nums">
                  {pct(d.withRate)}
                </p>
              </div>

              <div className="relative mx-1.5 mt-2.5 h-3">
                {/* Recessive scale: hairlines at 0 / 50 / 100, never dashed. */}
                {[0, 50, 100].map(t => (
                  <span
                    key={t}
                    className="absolute top-0 h-full w-px bg-warm-300"
                    style={{ left: `${t}%` }}
                    aria-hidden="true"
                  />
                ))}
                {/* The connector is the effect size. */}
                <span
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-teal-300"
                  style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
                  aria-hidden="true"
                />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400 ring-2 ring-[var(--color-surface)]"
                  style={{ left: `${d.otherRate * 100}%` }}
                  title={`${pct(d.otherRate)} ${d.otherLabel}`}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-700 ring-2 ring-[var(--color-surface)]"
                  style={{ left: `${d.withRate * 100}%` }}
                  title={`${pct(d.withRate)} on days with ${d.factor.toLowerCase()}`}
                />
              </div>

              <p className="mt-2 text-xs text-warm-500 tabular-nums">
                {d.days} of {d.total} days · {pct(d.otherRate)} {d.otherLabel}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative mx-1.5 mt-4 h-4 text-[11px] text-warm-500 tabular-nums" aria-hidden="true">
        <span className="absolute left-0">0%</span>
        <span className="absolute left-1/2 -translate-x-1/2">50%</span>
        <span className="absolute right-0">100%</span>
      </div>
    </figure>
  );
}
