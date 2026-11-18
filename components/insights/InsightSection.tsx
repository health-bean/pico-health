'use client';

import { useState, type ReactNode } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';

type SectionVariant = 'trigger' | 'watch' | 'helper';

// Each section carries its own colour, drawn from the brand's warm range:
// clay/brick for what goes with symptoms, ochre for what to watch, teal for
// what helps (the same "good for you" as Allowed; olive was retired because
// it read as a muddy teal and not as "good"). The colour lives in the heading
// and in one faintly tinted panel per section; findings are rows inside it,
// split by hairlines, so a phone screen shows more than one section at once.
const variants = {
  trigger: { titleColor: 'text-brick-600', iconColor: 'text-clay-500', panel: 'border-brick-600/15 bg-brick-600/[0.045] divide-brick-600/12' },
  watch: { titleColor: 'text-ochre-700', iconColor: 'text-ochre-500', panel: 'border-ochre-500/30 bg-ochre-500/[0.08] divide-ochre-500/25' },
  helper: { titleColor: 'text-teal-700', iconColor: 'text-teal-600', panel: 'border-teal-600/20 bg-teal-600/[0.055] divide-teal-600/15' },
};

interface InsightSectionProps {
  variant: SectionVariant;
  icon: LucideIcon;
  title: string;
  /** One plain line under the heading, when the heading needs it. */
  subtitle?: string;
  /** Cards with moderate or strong evidence. */
  items: ReactNode[];
  /** Early signals: kept behind "+N early signals" at the end of the section. */
  earlyItems?: ReactNode[];
  /** Cards shown before "Show N more". */
  cap?: number;
  /** Open the early signals from the start (used when nothing else has cleared the bar). */
  earlyOpen?: boolean;
}

export function InsightSection({ variant, icon: Icon, title, subtitle, items, earlyItems = [], cap = 3, earlyOpen = false }: InsightSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [showEarly, setShowEarly] = useState(earlyOpen);
  const [allEarly, setAllEarly] = useState(false);
  const v = variants[variant];
  // Early signals come after every stronger card, never between them, and
  // in their own short list: the weakest evidence must not read as the lead.
  const evidenceOpen = showAll || showEarly;
  const visible = evidenceOpen ? items : items.slice(0, cap);
  const hidden = items.length - cap;
  const early = allEarly ? earlyItems : earlyItems.slice(0, cap);
  const headingId = `insights-${variant}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${v.iconColor}`} aria-hidden="true" />
        <h2 id={headingId} className={`text-lg font-semibold ${v.titleColor}`}>{title}</h2>
      </div>
      {/* With no card above early-signal level, the subtitle would claim something nothing here shows. */}
      {items.length === 0 ? (
        <p className="mt-0.5 max-w-[65ch] text-sm text-warm-600">Nothing here has much evidence yet.</p>
      ) : (
        subtitle && <p className="mt-0.5 max-w-[65ch] text-sm text-warm-600">{subtitle}</p>
      )}

      {visible.length > 0 && <div className={`mt-2.5 divide-y overflow-hidden rounded-xl border ${v.panel}`}>{visible}</div>}

      {/* Before early signals open: "Show N more" and "+N early signals" share a row. */}
      {(!evidenceOpen && hidden > 0) || (!showEarly && earlyItems.length > 0) ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-6">
          {!evidenceOpen && hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="min-h-11 text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
            >
              Show {hidden} more
            </button>
          )}
          {!showEarly && earlyItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEarly(true)}
              aria-expanded={false}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {earlyItems.length} early {earlyItems.length === 1 ? 'signal' : 'signals'}
              <span className="font-normal text-[var(--color-text-muted)]">· could still be chance</span>
            </button>
          )}
        </div>
      ) : null}

      {showEarly && earlyItems.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-warm-600">Early signals, could still be chance</p>
          <div className="mt-2 divide-y divide-warm-200 overflow-hidden rounded-xl border border-warm-200 bg-[var(--color-surface-card)]">{early}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-6">
            {!allEarly && earlyItems.length > cap && (
              <button
                type="button"
                onClick={() => setAllEarly(true)}
                className="min-h-11 text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
              >
                Show {earlyItems.length - cap} more early signals
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowEarly(false);
                setAllEarly(false);
              }}
              aria-expanded={true}
              className="min-h-11 text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
            >
              Hide early signals
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
