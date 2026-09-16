'use client';

import { useState, useEffect, useCallback } from 'react';
import { InsightSection } from '@/components/insights/InsightSection';
import { InsightRow } from '@/components/insights/InsightRow';
import { HelperRow } from '@/components/insights/HelperRow';
import { AlertStack } from '@/components/insights/AlertStack';
import { DayView } from '@/components/insights/DayView';
import { Spinner, Card, PageTitle } from '@/components/ui';
import {
  Activity, Apple, CalendarDays, CalendarRange, Clock, ClipboardList, Eye, FlaskConical,
  Flame, Frown, Gauge, Moon, Pill, Search, ShieldAlert, Smile, ThumbsUp, Zap,
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

function getPercentage(result: SingleFactorResult | MultiFactorResult): number {
  return Math.round(result.conditionalRate * 100);
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
  const [timeRange, setTimeRange] = useState<TimeRange>(90);

  const today = new Date().toISOString().split('T')[0];

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
    loadData(timeRange);
  }, [timeRange, loadData]);

  const handleDismissAlert = useCallback(async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/insights/alerts/${id}`, { method: 'PATCH' });
  }, []);

  const handleClearAlerts = useCallback(async () => {
    setAlerts([]);
    await fetch('/api/insights/alerts', { method: 'PATCH' });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  // Separate and curate
  const allTriggers = patterns?.triggers ?? [];
  const multiTriggers = allTriggers.filter(r => isMultiFactor(r));
  const singleTriggers = allTriggers.filter(r => !isMultiFactor(r));
  const triggers = [...multiTriggers, ...singleTriggers]; // compounds first

  const propertyPatterns = patterns?.propertyPatterns ?? [];
  const helpers = patterns?.helpers ?? [];
  const progress = patterns?.progress ?? [];

  const hasInsights = triggers.length > 0 || propertyPatterns.length > 0 || helpers.length > 0;
  const daysTracked = patterns?.dataStatus?.daysTracked ?? 0;

  // An alert is a "New" mark on the curated row it points at. Only alerts
  // with no row to land on (progress milestones, patterns that have since
  // faded) are listed on their own, below the curated sections.
  const alertKeys = new Set(alerts.map(a => a.insightKey));
  const shownKeys = new Set([...triggers, ...helpers].map(resultKey));
  const orphanAlerts = alerts.filter(a => !shownKeys.has(a.insightKey));

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
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
              className={`min-h-10 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                timeRange === d
                  ? 'bg-white text-warm-900 shadow-sm'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Cold start */}
      {!hasInsights && (
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
          {/* Triggers to Avoid */}
          {triggers.length > 0 && (
            <InsightSection
              variant="trigger"
              icon={Flame}
              title="Triggers to Avoid"
              subtitle="These items correlate with your symptoms"
              totalCount={triggers.length}
              defaultVisible={3}
            >
              {triggers.map((r, i) => (
                <InsightRow
                  key={`t-${i}`}
                  icon={getIcon(r)}
                  title={getTitle(r)}
                  description={r.description}
                  percentage={getPercentage(r)}
                  foods={getFoods(r)}
                  isCompound={isMultiFactor(r)}
                  confidence={r.confidence}
                  isNew={alertKeys.has(resultKey(r))}
                />
              ))}
            </InsightSection>
          )}

          {/* Patterns to Watch */}
          {propertyPatterns.length > 0 && (
            <InsightSection
              variant="watch"
              icon={Eye}
              title="Patterns to Watch"
              subtitle="These patterns may explain multiple symptoms"
              totalCount={propertyPatterns.length}
              defaultVisible={2}
            >
              {propertyPatterns.map((p, i) => (
                <InsightRow
                  key={`p-${i}`}
                  icon={FlaskConical}
                  title={`${p.severity !== 'high' ? p.severity.replace('_', ' ') + ' ' : ''}${p.property} sensitivity`}
                  description={p.description}
                  percentage={Math.round((p.frequency / (daysTracked || 1)) * 100)}
                  foods={p.foods.length > 0 ? p.foods : undefined}
                />
              ))}
            </InsightSection>
          )}

          {/* Things That Help */}
          {helpers.length > 0 && (
            <InsightSection
              variant="helper"
              icon={ThumbsUp}
              title="Things That Help"
              subtitle="Keep doing these — they're working"
              totalCount={helpers.length}
              defaultVisible={3}
            >
              {helpers.map((r, i) => (
                <HelperRow
                  key={`h-${i}`}
                  icon={getIcon(r)}
                  title={getTitle(r)}
                  description={r.description}
                  percentage={getPercentage(r)}
                  confidence={r.confidence}
                  isNew={alertKeys.has(resultKey(r))}
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

      {orphanAlerts.length > 0 && (
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
        <DayView initialDate={today} initialComposite={composite} />
      </div>
    </div>
  );
}
