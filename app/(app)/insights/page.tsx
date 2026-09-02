'use client';

import { useState, useEffect, useCallback } from 'react';
import { InsightSection } from '@/components/insights/InsightSection';
import { InsightRow } from '@/components/insights/InsightRow';
import { HelperRow } from '@/components/insights/HelperRow';
import { AlertStack } from '@/components/insights/AlertStack';
import { DayView } from '@/components/insights/DayView';
import { Spinner, Card } from '@/components/ui';
import type { DayComposite, InsightsOutput, InsightAlert, SingleFactorResult, MultiFactorResult } from '@/lib/insights/types';

const FACTOR_ICONS: Record<string, string> = {
  food: '🍽️', food_property: '🧪', supplement: '💊', medication: '💉',
  exposure: '☣️', exercise: '🏊', sleep: '😴', stress: '😤',
  energy: '⚡', mood: '🧠', pain: '🩹', timing: '🕐', compliance: '📋',
};

const PROPERTY_ICONS: Record<string, string> = {
  nightshade: '🌶️', histamine: '🧪', oxalate: '💎', fodmap: '🫧',
  lectin: '🫘', salicylate: '💊', amines: '🧬', tyramine: '🧀',
};

function getIcon(result: SingleFactorResult | MultiFactorResult): string {
  if ('factors' in result) {
    const first = (result as MultiFactorResult).factors[0];
    return PROPERTY_ICONS[first.key.split(':')[1]?.split('_')[0]] ?? FACTOR_ICONS[first.category] ?? '🔍';
  }
  const f = (result as SingleFactorResult).factor;
  if (f.category === 'food_property') {
    return PROPERTY_ICONS[f.key.replace('food_property:', '').split('_')[0]] ?? '🧪';
  }
  return FACTOR_ICONS[f.category] ?? '🔍';
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      {/* Header + Timeframe */}
      <div className="flex items-center justify-between py-5">
        <h1 className="font-display text-2xl text-warm-900">Insights</h1>
        <div className="flex gap-1 bg-warm-100 rounded-lg p-0.5">
          {([30, 90, 180] as TimeRange[]).map(d => (
            <button
              key={d}
              onClick={() => setTimeRange(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                timeRange === d
                  ? 'bg-white text-warm-900 shadow-sm'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          <AlertStack alerts={alerts} onDismiss={handleDismissAlert} />
        </div>
      )}

      {/* Cold start */}
      {!hasInsights && (
        <Card className="p-5 mb-4 text-center">
          <p className="text-sm text-warm-600 font-medium">Patterns emerge with more data.</p>
          <p className="text-xs text-warm-400 mt-1">
            {daysTracked} days tracked — patterns typically appear around 14 days.
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
              icon="⚠️"
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
                />
              ))}
            </InsightSection>
          )}

          {/* Patterns to Watch */}
          {propertyPatterns.length > 0 && (
            <InsightSection
              variant="watch"
              icon="👁️"
              title="Patterns to Watch"
              subtitle="These patterns may explain multiple symptoms"
              totalCount={propertyPatterns.length}
              defaultVisible={2}
            >
              {propertyPatterns.map((p, i) => (
                <InsightRow
                  key={`p-${i}`}
                  icon={PROPERTY_ICONS[p.property] ?? '🔬'}
                  title={`${p.severity !== 'high' ? p.severity + ' ' : ''}${p.property} sensitivity`}
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
              icon="✅"
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
                />
              ))}
            </InsightSection>
          )}

          {/* Progress */}
          {progress.length > 0 && (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📈</span>
                <h3 className="text-[15px] font-bold text-warm-900">Your Progress</h3>
              </div>
              <div className="space-y-2">
                {progress.map((o, i) => (
                  <div key={i} className="p-2.5 bg-emerald-50 rounded-lg">
                    <p className="text-[13px] text-emerald-800">{o.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Your Day */}
      <div className="mt-8 pt-6 border-t border-warm-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">📅</span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-warm-400">Your Day</h2>
        </div>
        <DayView initialDate={today} initialComposite={composite} />
      </div>
    </div>
  );
}
