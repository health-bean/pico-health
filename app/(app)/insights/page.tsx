'use client';

import { useState, useEffect, useCallback } from 'react';
import { InsightSection } from '@/components/insights/InsightSection';
import { InsightCard } from '@/components/insights/InsightCard';
import { AlertStack } from '@/components/insights/AlertStack';
import { DayView } from '@/components/insights/DayView';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Spinner, PageTitle } from '@/components/ui';
import {
  Activity, CalendarDays, ChevronRight, CalendarRange, RotateCcw, Clock, ClipboardList, Eye, FlaskConical,
  Droplets, Frown, Gauge, Moon, Pill, Search, ShieldAlert, Smile, Sparkles, TrendingDown, TrendingUp, Utensils, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { DayComposite, InsightsOutput, InsightAlert, SingleFactorResult, MultiFactorResult } from '@/lib/insights/types';
import { insightKey } from '@/lib/insights/types';
import { findingText, propertyCards } from '@/lib/insights/finding-text';
import { SuggestRating } from '@/components/insights/SuggestRating';

const FACTOR_ICONS: Record<string, LucideIcon> = {
  food: Utensils, food_property: FlaskConical, supplement: Pill, medication: Pill,
  exposure: ShieldAlert, exercise: Activity, sleep: Moon, stress: Gauge,
  energy: Zap, mood: Smile, pain: Frown, timing: Clock, compliance: ClipboardList,
  practice: Sparkles, cycle: Droplets,
};

function getIcon(result: SingleFactorResult | MultiFactorResult): LucideIcon {
  const f = 'factors' in result ? (result as MultiFactorResult).factors[0] : (result as SingleFactorResult).factor;
  return FACTOR_ICONS[f.category] ?? Search;
}

/** A meal-timing row (lib/insights/timing.ts): counts meals, not days. */
function isTimed(result: SingleFactorResult | MultiFactorResult): boolean {
  return 'basis' in result && result.basis === 'meals';
}

function getTotalDays(result: SingleFactorResult | MultiFactorResult): number {
  return 'factors' in result ? (result as MultiFactorResult).coOccurrences : (result as SingleFactorResult).totalOpportunities;
}

/** The food a single-food pattern is about, or null for anything else. */
function singleFood(result: SingleFactorResult | MultiFactorResult): string | null {
  const factors = 'factors' in result ? (result as MultiFactorResult).factors : [(result as SingleFactorResult).factor];
  return factors.length === 1 && factors[0].category === 'food' ? factors[0].label : null;
}

function isMultiFactor(result: SingleFactorResult | MultiFactorResult): boolean {
  return 'factors' in result && (result as MultiFactorResult).factorCount >= 2;
}

function resultKey(result: SingleFactorResult | MultiFactorResult): string {
  const factors = 'factors' in result ? (result as MultiFactorResult).factors : [(result as SingleFactorResult).factor];
  return insightKey(factors, result.outcome);
}

type TimeRange = 30 | 90 | 180;

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [composite, setComposite] = useState<DayComposite | null>(null);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<InsightsOutput | null>(null);
  const [alerts, setAlerts] = useState<InsightAlert[]>([]);
  // Foods already on the person's own list: no "add to your list?" for them.
  const [rated, setRated] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('/api/foods/personal-rating')
      .then(r => (r.ok ? r.json() : { ratings: [] }))
      .then((d: { ratings: { foodName: string }[] }) => setRated(new Set(d.ratings.map(x => x.foodName.toLowerCase()))))
      .catch(() => {});
  }, []);
  // The chosen window is remembered per viewer, so someone who needs 180 days
  // does not wait through the default analysis first on every visit.
  const [timeRange, setTimeRangeState] = useState<TimeRange | null>(null);
  useEffect(() => {
    let stored: TimeRange = 90;
    try {
      const v = Number(localStorage.getItem('pico:insights-range'));
      if (v === 30 || v === 90 || v === 180) stored = v;
    } catch {
      // storage unavailable: use the default
    }
    setTimeRangeState(stored);
  }, []);
  const setTimeRange = useCallback((d: TimeRange) => {
    setTimeRangeState(d);
    try {
      localStorage.setItem('pico:insights-range', String(d));
    } catch {
      // ignore
    }
  }, []);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // Early signals live at the end of each section ("+N early signals"). When
  // nothing else has cleared the bar, the empty state offers them instead,
  // and this opens them in place.
  const [showEarly, setShowEarly] = useState(false);
  // "See it in Insights" from a food on the Log: ?focus=histamine opens at that card.
  // From Next's router, not window.location: on an in-app navigation the new
  // page renders before the address bar changes. Cleared once it has been shown.
  const focusParam = useSearchParams().get('focus');
  const [focusDone, setFocusDone] = useState<string | null>(null);
  const focus = focusParam && focusParam !== focusDone ? focusParam : null;
  // Once the cards are on screen, bring the focused one into view; the outline fades after a moment.
  const hasPatterns = patterns !== null;
  useEffect(() => {
    if (!focus || !hasPatterns) return;
    const el = document.getElementById(`watch-${focus}`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const t = window.setTimeout(() => setFocusDone(focus), 2500);
    return () => window.clearTimeout(t);
  }, [focus, hasPatterns]);
  // A failed load used to fall through to "Nothing logged in the last N
  // days", which is false. It now says it couldn't load.
  const [loadFailed, setLoadFailed] = useState(false);

  const loadData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const [dayRes, alertsRes, patternsRes] = await Promise.all([
        fetch(`/api/insights/day?date=${today}`),
        fetch('/api/insights/alerts'),
        fetch(`/api/insights/patterns?days=${days}`),
      ]);

      // "Your day" opens on the most recent day with entries: an empty Today
      // shows nothing for anyone who logs in the evening or took a break.
      let day: DayComposite | null = dayRes.ok ? await dayRes.json() : null;
      let date = today;
      if (!day || day.entryCount === 0) {
        const stats = await fetch('/api/entries/stats').then(r => (r.ok ? r.json() : null)).catch(() => null);
        const last: string | null = stats?.lastEntryDate ?? null;
        if (last && last !== today) {
          const lastRes = await fetch(`/api/insights/day?date=${last}`);
          if (lastRes.ok) {
            day = await lastRes.json();
            date = last;
          }
        }
      }
      if (day) setComposite(day);
      setDayDate(date);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (patternsRes.ok) {
        setPatterns(await patternsRes.json());
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    if (timeRange !== null) loadData(timeRange);
  }, [timeRange, loadData]);

  const handleDismissAlert = useCallback(async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/insights/alerts/${id}`, { method: 'PATCH' });
  }, []);

  const handleClearAlerts = useCallback(async () => {
    setAlerts([]);
    await fetch('/api/insights/alerts', { method: 'PATCH' });
  }, []);

  // Only the very first load gets the blank spinner. Changing the range
  // keeps the current sections on screen and marks the page busy, so the
  // 180-day analysis (which can take several seconds) never blanks the tab.
  if ((loading && !patterns) || timeRange === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  // Evidence first; early signals wait at the end of their own section.
  const isEarly = (r: { confidence?: string }) => r.confidence === 'early';
  const allTriggers = patterns?.triggers ?? [];
  const orderedTriggers = [...allTriggers.filter(r => isMultiFactor(r)), ...allTriggers.filter(r => !isMultiFactor(r))]; // compounds first
  const triggers = orderedTriggers.filter(r => !isEarly(r));
  const earlyTriggers = orderedTriggers.filter(isEarly);
  const allHelpers = patterns?.helpers ?? [];
  const helpers = allHelpers.filter(r => !isEarly(r));
  const earlyHelpers = allHelpers.filter(isEarly);
  const earlyCount = earlyTriggers.length + earlyHelpers.length;

  // One card per property (merged when two cover the same foods and counts).
  const propertyPatterns = propertyCards(patterns?.propertyPatterns ?? []);

  // The same food can raise one symptom and lower another. Say so on both
  // rows so a person does not read the two lists as a contradiction.
  const singleKey = (r: SingleFactorResult | MultiFactorResult) =>
    'factors' in r && (r as MultiFactorResult).factorCount >= 2 ? null : ('factors' in r ? (r as MultiFactorResult).factors[0].key : (r as SingleFactorResult).factor.key);
  const triggerOutcomes = new Map<string, string[]>();
  for (const r of allTriggers) { const k = singleKey(r); if (k) triggerOutcomes.set(k, [...(triggerOutcomes.get(k) ?? []), r.outcome.label]); }
  const helperOutcomes = new Map<string, string[]>();
  for (const r of allHelpers) { const k = singleKey(r); if (k) helperOutcomes.set(k, [...(helperOutcomes.get(k) ?? []), r.outcome.label]); }
  const crossNote = (r: SingleFactorResult | MultiFactorResult, other: Map<string, string[]>, where: string) => {
    const k = singleKey(r);
    if (k) {
      const outcomes = other.get(k);
      return outcomes && outcomes.length > 0
        ? `Also showed up ${where} for ${outcomes.slice(0, 2).map(o => o.toLowerCase()).join(' and ')}.`
        : undefined;
    }
    // Combinations: one short sentence naming the parts that also appear on the other list.
    const parts = (r as MultiFactorResult).factors.filter(f => (other.get(f.key)?.length ?? 0) > 0).map(f => f.label.toLowerCase());
    if (parts.length === 0) return undefined;
    return `Separately, ${parts.join(' and ')} also showed up ${where}.`;
  };

  const progress = patterns?.progress ?? [];

  // After a failed load, `patterns` still holds the previous window: never show it as this one.
  const hasInsights = !loadFailed && (
    triggers.length > 0 || propertyPatterns.length > 0 || helpers.length > 0 || (showEarly && earlyCount > 0));

  // Symptom counts month over month. Independent of the patterns, so it shows
  // on an empty page too.
  const progressSection = progress.length > 0 && (
    <section aria-labelledby="progress-heading">
      <div className="flex items-center gap-2 border-b border-warm-300 pb-2">
        <CalendarRange className="h-4 w-4 shrink-0 text-warm-600" aria-hidden="true" />
        <h2 id="progress-heading" className="text-lg font-semibold text-warm-900">The last 30 days vs. the 30 before</h2>
      </div>
      <p className="mt-2 max-w-[65ch] text-sm text-warm-600">
        Symptom days, side by side. Chronic conditions move in waves, so this is a comparison, not a scorecard.
      </p>
      <ul className="mt-2 divide-y divide-warm-200/70">
        {progress.map((o, i) => (
          <li key={i} className="py-2.5 text-sm text-warm-700">{o.observation}</li>
        ))}
      </ul>
    </section>
  );
  const daysTracked = patterns?.dataStatus?.daysTracked ?? 0;
  const watching = patterns?.watching;
  const factorsCompared = patterns?.dataStatus?.factorsCompared;
  const symptomsCompared = patterns?.dataStatus?.symptomsCompared;
  const loggedDays = `${daysTracked} logged ${daysTracked === 1 ? 'day' : 'days'}`;
  const comparedSentence =
    symptomsCompared === 0
      ? `No symptoms logged across ${loggedDays}, so there is nothing to compare against yet.`
      : factorsCompared && symptomsCompared
        ? `Across ${loggedDays}, ${factorsCompared} foods and habits were compared with your ${symptomsCompared} ${symptomsCompared === 1 ? 'symptom' : 'symptoms'}. None of them lines up with a symptom more often than chance would.`
        : `Across ${loggedDays}, nothing lines up with a symptom more often than chance would.`;

  // An alert is a "New" mark on the curated row it points at. Only alerts
  // with no row to land on (progress milestones, patterns that have since
  // faded) are listed on their own, below the curated sections.
  const alertKeys = new Set(alerts.map(a => a.insightKey));
  // Match against every row, including hidden early signals, so an alert for
  // an early signal waits for its row instead of appearing out of context.
  const shownKeys = new Set([...(patterns?.triggers ?? []), ...(patterns?.helpers ?? [])].map(resultKey));
  const orphanAlerts = alerts.filter(a => !shownKeys.has(a.insightKey));

  const triggerCard = (r: SingleFactorResult | MultiFactorResult) => {
    const t = findingText(r);
    const food = singleFood(r);
    return (
      <InsightCard
        key={resultKey(r)}
        icon={getIcon(r)}
        factor={t.title.factor}
        outcome={t.title.outcome}
        sentence={t.sentence}
        compare={t.compare}
        strength={r.confidence}
        isNew={alertKeys.has(resultKey(r))}
        note={crossNote(r, helperOutcomes, 'on better days')}
        action={
          food && !isTimed(r) && !rated.has(food.toLowerCase()) ? (
            <SuggestRating
              foodName={food}
              suggestion="unsafe"
              evidence={{ pattern: r.outcome.label, days: r.frequency, of: getTotalDays(r), confidence: r.confidence }}
            />
          ) : null
        }
      />
    );
  };

  const helperCard = (r: SingleFactorResult | MultiFactorResult) => {
    const t = findingText(r);
    const food = singleFood(r);
    return (
      <InsightCard
        key={resultKey(r)}
        icon={getIcon(r)}
        factor={t.title.factor}
        outcome={t.title.outcome}
        sentence={t.sentence}
        compare={t.compare}
        strength={r.confidence}
        isNew={alertKeys.has(resultKey(r))}
        relation="with"
        note={crossNote(r, triggerOutcomes, 'with symptoms')}
        action={
          food && !isTimed(r) && !rated.has(food.toLowerCase()) && !triggerOutcomes.has(singleKey(r) ?? '') ? (
            <SuggestRating
              foodName={food}
              suggestion="safe"
              evidence={{ pattern: `less ${r.outcome.label.toLowerCase()}`, days: r.frequency, of: getTotalDays(r), confidence: r.confidence }}
            />
          ) : null
        }
      />
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24" aria-busy={loading}>
      {/* Header + Timeframe */}
      <div className="flex items-center justify-between py-5">
        <PageTitle>Insights</PageTitle>
        <div role="group" aria-label="Time range" className="flex gap-0.5 rounded-lg bg-warm-100 p-0.5">
          {([30, 90, 180] as TimeRange[]).map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={timeRange === d}
              onClick={() => setTimeRange(d)}
              className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                timeRange === d
                  ? 'bg-[var(--color-surface-card)] text-warm-900 shadow-[var(--shadow-card)]'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {loading && timeRange === d ? <Spinner size="sm" /> : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Reintroductions: always one tap away, before anything else. */}
      <Link
        href="/reintroductions"
        className="mb-4 flex min-h-12 items-center gap-3 rounded-xl border border-warm-200 bg-[var(--color-surface-card)] py-2 pl-3 pr-2 hover:bg-warm-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-warm-900">Reintroductions</span>
          <span className="block text-xs text-[var(--color-text-muted)]">Test a food you&rsquo;ve cut out</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />
      </Link>

      {loadFailed && (
        <section role="alert" className="mb-6 max-w-[65ch] space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-warm-900">Couldn&rsquo;t load your patterns</h2>
          <p className="text-sm text-warm-600">Your log is safe. This is a problem on our side or with the connection.</p>
          <button
            type="button"
            onClick={() => timeRange !== null && loadData(timeRange)}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      )}



      {/* Nothing in this window, but recent alerts point at an older one.
          Same unboxed shape as the empty state below. */}
      {!loadFailed && !hasInsights && orphanAlerts.length > 0 && timeRange < 180 && (
        <div className="space-y-9">
          <section aria-labelledby="earlier-heading" className="max-w-[65ch] space-y-3">
            <h2 id="earlier-heading" className="font-[family-name:var(--font-display)] text-2xl font-semibold text-warm-900">
              Your patterns are from earlier
            </h2>
            <p className="text-sm text-warm-600">
              {daysTracked} of the last {timeRange} days logged, and nothing in that stretch stands out on its own. A longer window still has them.
            </p>
            <button
              type="button"
              onClick={() => setTimeRange(180)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
            >
              Show the last 180 days
            </button>
          </section>
          {progressSection}
        </div>
      )}

      {/* Nothing has cleared the bar. Most people see this for their first
          two or three months, so it says how hard the engine looked rather
          than promising a date: a progress bar here once promised patterns at
          14 days and sat full on an empty page. */}
      {!loadFailed && !hasInsights && (orphanAlerts.length === 0 || timeRange >= 180) && (
        <div className="space-y-9">
          <section aria-labelledby="empty-heading" className="max-w-[65ch] space-y-3">
            <h2 id="empty-heading" className="font-[family-name:var(--font-display)] text-2xl font-semibold text-warm-900">
              {daysTracked === 0 ? `Nothing logged in the last ${timeRange} days` : 'Nothing stands out yet'}
            </h2>
            {daysTracked > 0 && (
              <>
                <p className="text-sm text-warm-600">{comparedSentence}</p>
                <p className="text-sm text-warm-600">
                  {daysTracked >= 90
                    ? 'Smaller or rarer patterns can take longer to show. This page updates as you log.'
                    : 'Log symptoms when they happen, not later in the day: the timing lets a strong reaction to something you eat often show within two to three weeks. Most patterns take two to three months of steady logging.'}
                </p>
              </>
            )}
            {daysTracked === 0 && (
              <p className="text-sm text-warm-600">Patterns come from what you log, so they start once there are days to compare.</p>
            )}
          </section>

          {/* Plain counts, never a forecast: "being checked" means there is
              enough to test, not that anything will turn up. */}
          {daysTracked > 0 && watching && (watching.symptoms.length > 0 || watching.foods.length > 0) && (
            <section aria-labelledby="watching-heading" className="max-w-[65ch]">
              <h3 id="watching-heading" className="text-base font-semibold text-warm-900">What&rsquo;s being watched</h3>
              <p className="mt-1 text-sm text-warm-600">
                Anything logged on {watching.minDays} or more days is checked each time you log. Below that there isn&rsquo;t enough to test yet.
              </p>
              {[{ title: 'Symptoms', items: watching.symptoms }, { title: 'Foods', items: watching.foods }]
                .filter(g => g.items.length > 0)
                .map(g => (
                  <div key={g.title} className="mt-4">
                    <h4 className="text-xs font-semibold text-warm-500">{g.title}</h4>
                    <ul className="mt-1 divide-y divide-warm-200/70">
                      {g.items.map(item => (
                        <li key={item.label} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-warm-900">{item.label}</span>
                          <span className="shrink-0 tabular-nums text-warm-600">
                            {item.days} {item.days === 1 ? 'day' : 'days'}
                            <span className={item.checkable ? 'ml-2 font-medium text-teal-700' : 'ml-2 text-warm-500'}>
                              {item.checkable
                                ? 'being checked'
                                : `${watching.minDays - item.days} more to check`}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </section>
          )}

          {progressSection}

          {earlyCount > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowEarly(true)}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-700 underline-offset-4 hover:text-teal-800 hover:underline"
              >
                See {earlyCount} early {earlyCount === 1 ? 'signal' : 'signals'}
              </button>
              <p className="text-sm text-warm-500">Patterns that could still be chance.</p>
            </div>
          )}
        </div>
      )}

      {hasInsights && (
        <div className="space-y-9">
          <div>
            <p className="max-w-[65ch] text-sm text-warm-600">
              Patterns in your own log, not a diagnosis. Worth raising with your practitioner before changing what you eat.
            </p>
          <details className="group text-sm text-warm-600">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-medium text-teal-700 hover:text-teal-800">
              How to read this
            </summary>
            <div className="mt-1 max-w-[65ch] space-y-2 rounded-xl bg-warm-50 p-3 leading-relaxed">
              <p>Each card is something that happened alongside a symptom, counted in days. It is a pattern in your own log, not proof of a cause and not a diagnosis. Worth raising with your practitioner.</p>
              <p>Cards counted in <span className="font-medium text-warm-800">times</span> are about timing: a symptom logged within four hours after you ate something. They need symptoms logged as they happen; entries logged together all at once are not counted.</p>
              <p>The dots show how much evidence is behind a card. <span className="font-medium text-warm-800">Early</span> (one dot) means it could still be chance: too few days so far, or a difference small enough to happen by coincidence. <span className="font-medium text-warm-800">Moderate</span> and <span className="font-medium text-warm-800">Strong</span> mean more days and a bigger difference from your other days. Early signals sit at the end of each section.</p>
              <p>&ldquo;Patterns worth keeping an eye on&rdquo; group foods by Pico&rsquo;s food ratings, which come from published lab studies and public health data. A practitioner hasn&rsquo;t reviewed them yet, so those cards rest on the ratings as well as your log.</p>
              <p>A <span className="font-medium text-warm-800">flare day</span> is a day with two or more different symptoms, or any symptom rated 7 or higher.</p>
            </div>
          </details>
          </div>

          {(triggers.length > 0 || earlyTriggers.length > 0) && (
            <InsightSection
              variant="trigger"
              icon={TrendingUp}
              title="Possible triggers"
              subtitle="These often came right before a symptom in your log."
              items={triggers.map(triggerCard)}
              earlyItems={earlyTriggers.map(triggerCard)}
              earlyOpen={showEarly}
            />
          )}

          {/* Patterns worth keeping an eye on */}
          {propertyPatterns.length > 0 && (
            <InsightSection
              variant="watch"
              icon={Eye}
              title="Patterns worth keeping an eye on"
              // These rows join your log against the food list, so part of
              // the claim is the list's. The list is cited but not yet
              // practitioner-reviewed, and the section should say so.
              subtitle="Based on Pico's food ratings, which a practitioner hasn't reviewed yet."
              // A link from the Log may point at a card past the first three: show them all.
              cap={focus ? 99 : undefined}
              items={propertyPatterns.map(g => (
                <InsightCard
                  key={g.key}
                  id={`watch-${g.noun}`}
                  highlight={focus === g.noun}
                  icon={FlaskConical}
                  factor={g.title}
                  sentence={g.sentence}
                />
              ))}
            />
          )}

          {/* Things that seem to help */}
          {(helpers.length > 0 || earlyHelpers.length > 0) && (
            <InsightSection
              variant="helper"
              icon={TrendingDown}
              title="Things that seem to help"
              items={helpers.map(helperCard)}
              earlyItems={earlyHelpers.map(helperCard)}
              earlyOpen={showEarly}
            />
          )}

          {progressSection}
        </div>
      )}

      {orphanAlerts.length > 0 && (hasInsights || timeRange >= 180) && (
        <div className="mt-6">
          <AlertStack alerts={orphanAlerts} onDismiss={handleDismissAlert} onClearAll={handleClearAlerts} />
        </div>
      )}

      {/* Your Day */}
      <div className="mt-8 pt-6 border-t border-warm-200">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4 text-warm-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-warm-900">Your day</h2>
        </div>
        <DayView initialDate={dayDate ?? today} initialComposite={composite} />
      </div>
    </div>
  );
}
