"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecommendedFood {
  id: string;
  displayName: string;
  category: string;
  priority: number;
  reason: string;
}

interface ReintroductionRecommendationsProps {
  protocolId: string;
  onSelectFood?: (foodId: string, foodName: string) => void;
}

export function ReintroductionRecommendations({
  protocolId,
  onSelectFood,
}: ReintroductionRecommendationsProps) {
  const [foods, setFoods] = useState<RecommendedFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [protocolId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reintroductions/recommendations?protocolId=${protocolId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch recommendations");
      }

      setFoods(data.recommendations || []);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return (
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
          High Priority
        </span>
      );
    } else if (priority >= 5) {
      return (
        <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
          Medium Priority
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-warm-100 px-2 py-0.5 text-xs font-medium text-warm-800">
          Low Priority
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-sm text-warm-600">Loading recommendations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-strong" />
          <div>
            <h3 className="text-sm font-semibold text-danger-strong">Error Loading Recommendations</h3>
            <p className="mt-1 text-sm text-danger-strong">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (foods.length === 0) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warm-100">
          <TrendingUp className="h-6 w-6 text-warm-500" />
        </div>
        <h3 className="text-base font-semibold text-warm-900">No Foods Ready</h3>
        <p className="mt-2 text-sm text-warm-600">
          No eliminated foods are ready for reintroduction yet. Keep tracking your symptoms and we&apos;ll recommend foods when you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-teal-600" />
          <div className="text-sm text-teal-900">
            <p className="font-medium">Recommended Foods for Reintroduction</p>
            <p className="mt-1 text-teal-700">
              These foods are prioritized based on your elimination history, symptom patterns, and protocol guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Food Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {foods.map((food) => (
          <div
            key={food.id}
            className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-5 transition-all hover:border-teal-300 hover:shadow-[var(--shadow-elevated)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-warm-900">
                  {food.displayName}
                </h3>
                <p className="mt-1 text-sm text-warm-600">{food.category}</p>
              </div>
              {getPriorityBadge(food.priority)}
            </div>

            {/* Reason */}
            <div className="mt-4 rounded-lg bg-warm-50 p-3">
              <p className="text-sm text-warm-700">{food.reason}</p>
            </div>

            {/* Action */}
            {onSelectFood && (
              <Button
                onClick={() => onSelectFood(food.id, food.displayName)}
                className="mt-4 w-full"
              >
                Start Reintroduction
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
