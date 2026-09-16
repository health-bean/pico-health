'use client';

import { useState, useEffect, useCallback } from 'react';
import { InsightSection } from '@/components/insights/InsightSection';
import { InsightRow } from '@/components/insights/InsightRow';
import { AlertStack } from '@/components/insights/AlertStack';
import { DayView } from '@/components/insights/DayView';
import Link from 'next/link';
import { Spinner, Card, PageTitle } from '@/components/ui';
import {
  Activity, Apple, CalendarDays, ChevronRight, CalendarRange, Clock, ClipboardList, Eye, FlaskConical,
  Frown, Gauge, Moon, Pill, Search, ShieldAlert, Smile, TrendingDown, TrendingUp, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { DayComposite, InsightsOutput, InsightAlert, SingleFactorResult, MultiFactorResult } from '@/lib/insights/types';
import { insightKey } from '@/lib/insights/types';

const FACTOR_ICONS: Record<string, LucideIcon> = {
  food: Apple, food_property: FlaskConical, supplement: Pill, medication: Pill,
  exposure: ShieldAlert, exercise: Activity, sleep: Moon, stress: Gauge,
  energy: Zap, mood: Smile, pain: Frown, timing: Clock, compliance: ClipboardList,
};

function getIcon(result: SingleFactorResult | MultiFactorResult): LucideIcon {
  const f = 'factors' in result ? (result as MultiFactorResult).factors[0] : (result as SingleFactorResult).factor;
  return FACTOR_ICONS[f.category] ?? Search;
}

function getTitle(result: SingleFactorResult | MultiFactorResult): string {
  if ('factors' in result && (result as MultiFactorResult).factorCount >= 2) {
    return (result as MultiFactorResult).factors.map(f => f.label).join(' + ');
  }
  return (result as SingleFactorResult).factor.label;
}

function getFoods(_result: SingleFactorResult | MultiFactorResult): string[] {
  // For food property patterns, we could list contributing foods
  // For now, return empty — the engine would need to track this
  return [];
}

/** Days the factor was present: the denominator behind every row. */
function getTotalDays(result: SingleFactorResult | MultiFactorResult): number {
  return 'factors' in result ? (result as MultiFactorResult).coOccurrences : (result as SingleFactorResult).totalOpportunities;
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
  const [patterns, setPatterns] = useState<InsightsOutput | null>(null);
  const [alerts, setAlerts] = useState<InsightAlert[]>([]);
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
  // Early signals (a handful of days) stay out of the default view so the
  // page leads with what has real evidence behind it. One tap brings them in.
  const [showEarly, setShowEarly] = useState(false);

  const loadData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const [dayRes, alertsRes, patternsRes] = await Promise.all([
        fetch(`/api/insights/day?date=${today}`),
        fetch('/api/insights/alerts'),
        fetch(`/api/insights/patterns?days=${days}`),
      ]);

      if (dayRes.ok) {
        const data = await dayRes.json();
        if (data) setComposite(data);
      }
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (patternsRes.ok) setPatterns(await patternsRes.json());
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

  // Separate and curate
  const withEvidence = <T extends { confidence?: string }>(rows: T[]) =>
    showEarly ? rows : rows.filter(r => r.confidence !== 'early');
  const earlyCount = [...(patterns?.triggers ?? []), ...(patterns?.helpers ?? [])].filter(r => r.confidence === 'early').length;
  const allTriggers = withEvidence(patterns?.triggers ?? []);
  const multiTriggers = allTriggers.filter(r => isMultiFactor(r));
  const singleTriggers = allTriggers.filter(r => !isMultiFactor(r));
  const triggers = [...multiTriggers, ...singleTriggers]; // compounds first

  // One row per property, not one per property × symptom: the symptoms it
  // lined up with become the row's sentence.
  const propertyGroups = (() => {
    const groups = new Map<string, { title: string; lines: { outcome: string; days: number; total: number }[]; impact: number }>();
    for (const p of patterns?.propertyPatterns ?? []) {
      const key = `${p.severity}|${p.property}`;
      const raw = `${p.severity !== 'high' ? p.severity.replace('_', ' ') + ' ' : ''}${p.property}`;
      const g = groups.get(key) ?? { title: raw.charAt(0).toUpperCase() + raw.slice(1), lines: [], impact: 0 };
      g.lines.push({ outcome: p.outcome.label, days: p.frequency, total: p.totalOpportunities ?? p.frequency });
      g.impact = Math.max(g.impact, p.impactScore);
      groups.set(key, g);
    }
    return [...groups.values()]
      .map(g => ({ ...g, lines: g.lines.sort((a, b) => b.days / b.total - a.days / a.total) }))
      .sort((a, b) => b.impact - a.impact);
  })();
  const propertyPatterns = propertyGroups;
  const helpers = withEvidence(patterns?.helpers ?? []);

  // The same food can raise one symptom and lower another. Say so on both
  // rows so a person does not read the two lists as a contradiction.
  const singleKey = (r: SingleFactorResult | MultiFactorResult) =>
    'factors' in r && (r as MultiFactorResult).factorCount >= 2 ? null : ('factors' in r ? (r as MultiFactorResult).factors[0].key : (r as SingleFactorResult).factor.key);
  const triggerOutcomes = new Map<string, string[]>();
  for (const r of allTriggers) { const k = singleKey(r); if (k) triggerOutcomes.set(k, [...(triggerOutcomes.get(k) ?? []), r.outcome.label]); }
  const helperOutcomes = new Map<string, string[]>();
  for (const r of helpers) { const k = singleKey(r); if (k) helperOutcomes.set(k, [...(helperOutcomes.get(k) ?? []), r.outcome.label]); }
  const crossNote = (r: SingleFactorResult | MultiFactorResult, other: Map<string, string[]>, where: string) => {
    const k = singleKey(r);
    if (k) {
      const outcomes = other.get(k);
      return outcomes && outcomes.length > 0 ? `Also listed under ${where} for ${outcomes.slice(0, 2).join(' and ')}.` : undefined;
    }
    // Combinations: name each part that also appears on the other list.
    const parts = (r as MultiFactorResult).factors
      .map(f => ({ label: f.label, outcomes: other.get(f.key) }))
      .filter(x => x.outcomes && x.outcomes.length > 0);
    if (parts.length === 0) return undefined;
    return parts.map(x => `${x.label} on its own is also listed under ${where} for ${x.outcomes!.slice(0, 2).join(' and ')}.`).join(' ');
  };

  // The three observations with the most evidence behind them, across both
  // lists, so the page opens with an answer before the full lists.
  const standouts = [...triggers.map(r => ({ r, dir: 'more' as const })), ...helpers.map(r => ({ r, dir: 'less' as const }))]
    .filter(x => x.r.confidence !== 'early')
    .sort((a, b) => b.r.impactScore - a.r.impactScore)
    .slice(0, 3);
  const progress = patterns?.progress ?? [];

  const hasInsights = triggers.length > 0 || propertyPatterns.length > 0 || helpers.length > 0;
  const daysTracked = patterns?.dataStatus?.daysTracked ?? 0;

  // An alert is a "New" mark on the curated row it points at. Only alerts
  // with no row to land on (progress milestones, patterns that have since
  // faded) are listed on their own, below the curated sections.
  const alertKeys = new Set(alerts.map(a => a.insightKey));
  // Match against every row, including hidden early signals, so an alert for
  // an early signal waits for its row instead of appearing out of context.
  const shownKeys = new Set([...(patterns?.triggers ?? []), ...(patterns?.helpers ?? [])].map(resultKey));
  const orphanAlerts = alerts.filter(a => !shownKeys.has(a.insightKey));

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

      {(hasInsights || earlyCount > 0) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <details className="group text-sm text-warm-600">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-medium text-teal-700 hover:text-teal-800">
              How to read this
            </summary>
            <div className="mt-1 max-w-[65ch] space-y-2 rounded-xl bg-warm-50 p-3 leading-relaxed">
              <p>Each row is something that happened alongside a symptom, counted in days. It is a pattern in your own log, not a cause or a diagnosis. Worth raising with your practitioner.</p>
              <p><span className="font-medium text-warm-800">Early signal</span> means only a few days so far. <span className="font-medium text-warm-800">Moderate</span> and <span className="font-medium text-warm-800">strong evidence</span> mean more days and a bigger difference from your other days.</p>
              <p>A <span className="font-medium text-warm-800">flare day</span> is a day with two or more symptoms logged, or any symptom rated 7 or higher.</p>
            </div>
          </details>
          {earlyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowEarly(v => !v)}
              aria-pressed={showEarly}
              className="min-h-11 rounded-lg px-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              {showEarly ? 'Hide early signals' : `Include ${earlyCount} early signals`}
            </button>
          )}
        </div>
      )}

            {/* Nothing in this window, but recent alerts point at an older one */}
      {!hasInsights && orphanAlerts.length > 0 && timeRange < 180 && (
        <Card className="p-5 mb-4 text-center">
          <p className="text-sm text-warm-600 font-medium">Your patterns are from before the last {timeRange} days.</p>
          <p className="text-sm text-warm-500 mt-1">
            {daysTracked} of the last {timeRange} days logged. A wider window still has them.
          </p>
          <button
            type="button"
            onClick={() => setTimeRange(180)}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-50 px-4 text-sm font-medium text-teal-700 hover:bg-teal-100"
          >
            Show the last 180 days
          </button>
        </Card>
      )}

      {/* Cold start */}
      {!hasInsights && (orphanAlerts.length === 0 || timeRange >= 180) && (
        <Card className="p-5 mb-4 text-center">
          <p className="text-sm text-warm-600 font-medium">Patterns emerge with more data.</p>
          <p className="text-sm text-warm-500 mt-1">
            {daysTracked} of the last {timeRange} days logged. Patterns typically appear around 14 logged days.
          </p>
          <div className="mt-3 h-1.5 w-full max-w-[200px] mx-auto rounded-full bg-warm-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-400 transition-all"
              style={{ width: `${Math.min((daysTracked / 14) * 100, 100)}%` }}
            />
          </div>
        </Card>
      )}

      {hasInsights && (
        <div className="space-y-4">
          <p className="max-w-[65ch] text-sm text-warm-600">
            These are patterns in your own log, not causes or a diagnosis. Worth raising with your practitioner before changing what you eat.
          </p>

          {standouts.length > 0 && (
            <section aria-labelledby="standouts-heading" className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 id="standouts-heading" className="font-[family-name:var(--font-display)] text-lg font-semibold text-warm-900">
                What stands out
              </h2>
              <ul className="mt-2 divide-y divide-warm-200">
                {standouts.map(({ r, dir }, i) => (
                  <li key={`s-${i}`} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm text-warm-800">
                      <span className="font-semibold text-warm-900">{getTitle(r)}</span>
                      {' '}
                      {dir === 'more' ? 'showed up with' : 'showed up on days with less'}{' '}
                      {r.outcome.label.toLowerCase()}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-warm-900">
                      {r.frequency} of {getTotalDays(r)} days
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {/* Triggers to Avoid */}
          {triggers.length > 0 && (
            <InsightSection
              variant="trigger"
              icon={TrendingUp}
              title="Showed up with symptoms"
              subtitle="On days you logged these, the symptom was more common than on other days"
              totalCount={triggers.length}
              defaultVisible={3}
            >
              {triggers.map((r, i) => (
                <InsightRow
                  key={`t-${i}`}
                  icon={getIcon(r)}
                  title={getTitle(r)}
                  description={r.description}
                  days={r.frequency}
                  total={getTotalDays(r)}
                  foods={getFoods(r)}
                  isCompound={isMultiFactor(r)}
                  confidence={r.confidence}
                  isNew={alertKeys.has(resultKey(r))}
                  note={crossNote(r, helperOutcomes, 'better days')}
                  outcome={r.outcome.label}
                />
              ))}
            </InsightSection>
          )}

          {/* Patterns to Watch */}
          {propertyPatterns.length > 0 && (
            <InsightSection
              variant="watch"
              icon={Eye}
              title="Properties that keep appearing"
              subtitle="Food properties that showed up with one or more of your symptoms"
              totalCount={propertyPatterns.length}
              defaultVisible={2}
            >
              {propertyPatterns.map((g, i) => (
                <InsightRow
                  key={`p-${i}`}
                  icon={FlaskConical}
                  title={`${g.title} foods`}
                  description={g.lines.slice(0, 3).map(l => `${l.outcome} on ${l.days} of ${l.total} days`).join(' · ')}
                  days={g.lines[0].days}
                  total={g.lines[0].total}
                  outcome={g.lines[0].outcome}
                />
              ))}
            </InsightSection>
          )}

          {/* Things That Help */}
          {helpers.length > 0 && (
            <InsightSection
              variant="helper"
              icon={TrendingDown}
              title="Showed up on better days"
              subtitle="On days you logged these, the symptom was less common than on other days"
              totalCount={helpers.length}
              defaultVisible={3}
            >
              {helpers.map((r, i) => (
                <InsightRow
                  key={`h-${i}`}
                  icon={getIcon(r)}
                  title={getTitle(r)}
                  description={r.description}
                  days={r.frequency}
                  total={getTotalDays(r)}
                  confidence={r.confidence}
                  isNew={alertKeys.has(resultKey(r))}
                  tone="better"
                  note={crossNote(r, triggerOutcomes, 'symptoms')}
                  outcome={`Less ${r.outcome.label.toLowerCase()}`}
                />
              ))}
            </InsightSection>
          )}

          {/* Progress */}
          {progress.length > 0 && (
            <section className="bg-[var(--color-surface-card)] rounded-xl overflow-hidden shadow-[var(--shadow-card)] border border-warm-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarRange className="h-4 w-4 text-warm-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-warm-900">This month vs. last</h2>
              </div>
              <p className="mb-3 text-sm text-warm-600">
                Symptom days, side by side. Chronic conditions move in waves — this is a comparison, not a scorecard.
              </p>
              <div className="space-y-2">
                {progress.map((o, i) => (
                  <div key={i} className="p-2.5 bg-warm-50 rounded-lg">
                    <p className="text-sm text-warm-700">{o.observation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {orphanAlerts.length > 0 && (hasInsights || timeRange >= 180) && (
        <div className="mt-6">
          <AlertStack alerts={orphanAlerts} onDismiss={handleDismissAlert} onClearAll={handleClearAlerts} />
        </div>
      )}

      {hasInsights && (
        <Link
          href="/reintroductions"
          className="mt-6 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-warm-200 bg-[var(--color-surface-card)] px-4 py-3 text-sm hover:bg-warm-50"
        >
          <span>
            <span className="block font-medium text-warm-900">Want to test one of these?</span>
            <span className="block text-warm-600">A reintroduction adds a food back over a few days and records how you react.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-warm-500" aria-hidden="true" />
        </Link>
      )}

      {/* Your Day */}
      <div className="mt-8 pt-6 border-t border-warm-200">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4 text-warm-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-warm-900">Your day</h2>
        </div>
        <DayView initialDate={today} initialComposite={composite} />
      </div>
    </div>
  );
}
