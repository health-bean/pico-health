"use client";

import { Activity, TrendingUp, TrendingDown, Zap, AlertCircle } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import type { Insight } from "@/types";

interface ExerciseInsightsProps {
  insights: Insight[];
}

interface ExerciseInsightData {
  exerciseType: string;
  intensity: string;
  avgEnergyChange: number;
  correlationStrength: number;
  sampleSize: number;
  isPositive: boolean;
  confidence: number;
}

function parseExerciseInsight(insight: Insight): ExerciseInsightData | null {
  if (insight.type !== "exercise-energy") return null;

  // Parse trigger format: "exerciseType (intensity)"
  const match = insight.trigger.match(/^(.+?)\s*\((.+?)\)$/);
  if (!match) return null;

  const [, exerciseType, intensity] = match;
  const isPositive = insight.effect === "energy_boost";
  const avgEnergyChange = insight.impactScore || 0;

  return {
    exerciseType: exerciseType.trim(),
    intensity: intensity.trim(),
    avgEnergyChange: isPositive ? avgEnergyChange : -avgEnergyChange,
    correlationStrength: insight.confidence,
    sampleSize: insight.occurrences,
    isPositive,
    confidence: insight.percentage,
  };
}

function ExerciseInsightCard({ data }: { data: ExerciseInsightData }) {
  const { exerciseType, intensity, avgEnergyChange, sampleSize, isPositive, confidence } = data;

  // Simple bar visualization (text-based)
  const maxBarWidth = 100; // percentage
  const barWidth = Math.min(Math.abs(avgEnergyChange) * 10, maxBarWidth);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-warm-900">
                {exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1).replace(/_/g, " ")}
              </p>
              <p className="text-xs text-warm-500 capitalize">{intensity} intensity</p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  isPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {avgEnergyChange > 0 ? "+" : ""}
                {avgEnergyChange.toFixed(1)} points
              </p>
              <p className="text-xs text-warm-500">avg energy change</p>
            </div>
          </div>

          {/* Energy Impact Bar */}
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-warm-100">
              <div
                className={`h-2 rounded-full ${
                  isPositive ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={isPositive ? "allowed" : "avoid"}>
              {isPositive ? "Energy Boost" : "Energy Drain"}
            </Badge>
            <Badge variant="moderation">{confidence}% confidence</Badge>
            <span className="text-xs text-warm-500">
              {sampleSize} occurrence{sampleSize !== 1 ? "s" : ""}
            </span>
          </div>

          <p className="mt-2 text-xs text-warm-600">
            {isPositive
              ? `This exercise consistently increases your energy levels.`
              : `This exercise tends to decrease your energy levels.`}
          </p>
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-warm-200 bg-warm-50 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Activity className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-warm-900">
        Not enough exercise data yet
      </h3>
      <p className="mt-1 max-w-xs text-xs text-warm-500">
        Log at least 5 exercises to see energy patterns and correlations.
      </p>
    </div>
  );
}

export function ExerciseInsights({ insights }: ExerciseInsightsProps) {
  const exerciseInsights = insights
    .map(parseExerciseInsight)
    .filter((data): data is ExerciseInsightData => data !== null)
    .sort((a, b) => b.avgEnergyChange - a.avgEnergyChange); // Sort by energy change (highest boost first)

  if (exerciseInsights.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
          Exercise & Energy
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {exerciseInsights.map((data, index) => (
          <ExerciseInsightCard key={`${data.exerciseType}-${data.intensity}-${index}`} data={data} />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
          <p className="text-xs text-teal-700">
            These insights show how different exercises affect your energy levels within 24 hours.
            Track energy before and after exercise for more accurate patterns.
          </p>
        </div>
      </div>
    </div>
  );
}
