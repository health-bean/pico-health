"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EliminatedFood {
  foodId: string;
  foodName: string;
  category: string;
  reason: string;
  symptomFreedays: number;
  priority: number;
}

interface StartReintroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  protocolId: string;
}

export function StartReintroductionModal({
  isOpen,
  onClose,
  onSuccess,
  protocolId,
}: StartReintroductionModalProps) {
  const [eliminatedFoods, setEliminatedFoods] = useState<EliminatedFood[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<string>("");
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch eliminated foods when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEliminatedFoods();
      setSelectedFoodId("");
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const fetchEliminatedFoods = async () => {
    setIsLoadingFoods(true);
    setError(null);

    try {
      const response = await fetch("/api/reintroductions/recommendations");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch eliminated foods");
      }

      if (data.recommendations && data.recommendations.length > 0) {
        setEliminatedFoods(data.recommendations);
      } else {
        setError(
          data.message || "No eliminated foods available for reintroduction."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load eliminated foods"
      );
    } finally {
      setIsLoadingFoods(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedFoodId) {
      setError("Please select a food to reintroduce");
      return;
    }

    const selectedFood = eliminatedFoods.find(
      (food) => food.foodId === selectedFoodId
    );

    if (!selectedFood) {
      setError("Selected food not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reintroductions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodId: selectedFood.foodId,
          foodName: selectedFood.foodName,
          protocolId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to start reintroduction");
      }

      setSuccessMessage(
        `Successfully started reintroduction for ${selectedFood.foodName}!`
      );

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const selectedFood = eliminatedFoods.find(
    (food) => food.foodId === selectedFoodId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-warm-200 bg-[var(--color-surface-card)] shadow-[var(--shadow-float)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-warm-900">
            Start Food Reintroduction
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-warm-500 hover:bg-warm-100 hover:text-warm-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-danger-strong" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger-strong">Error</p>
                <p className="mt-1 text-sm text-danger-strong">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-900">Success</p>
                <p className="mt-1 text-sm text-teal-700">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingFoods && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <span className="ml-3 text-sm text-warm-600">
                Loading eliminated foods...
              </span>
            </div>
          )}

          {/* Form */}
          {!isLoadingFoods && eliminatedFoods.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Food Selection */}
              <div>
                <label
                  htmlFor="food-select"
                  className="mb-2 block text-sm font-medium text-warm-700"
                >
                  Select Food to Reintroduce <span className="text-danger-strong">*</span>
                </label>
                <select
                  id="food-select"
                  value={selectedFoodId}
                  onChange={(e) => setSelectedFoodId(e.target.value)}
                  className="w-full rounded-xl border border-warm-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Choose a food...</option>
                  {eliminatedFoods.map((food) => (
                    <option key={food.foodId} value={food.foodId}>
                      {food.foodName} ({food.category})
                    </option>
                  ))}
                </select>
                {selectedFood && (
                  <p className="mt-2 text-xs text-warm-600">
                    <span className="font-medium">Recommendation:</span>{" "}
                    {selectedFood.reason}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-teal-900">
                  Reintroduction Protocol (7 Days)
                </h3>
                <div className="space-y-3 text-sm text-teal-800">
                  <div>
                    <p className="font-medium">Testing Phase (Days 1-3)</p>
                    <ul className="ml-4 mt-1 list-disc space-y-1 text-teal-700">
                      <li>Eat the selected food once daily for 3 consecutive days</li>
                      <li>Log each time you eat this food</li>
                      <li>Monitor for any symptoms</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Observation Phase (Days 4-7)</p>
                    <ul className="ml-4 mt-1 list-disc space-y-1 text-teal-700">
                      <li>Avoid the food completely</li>
                      <li>Continue monitoring symptoms</li>
                      <li>Log any symptoms you experience</li>
                    </ul>
                  </div>
                  <div className="mt-3 border-t border-teal-200 pt-3">
                    <p className="font-medium">Important Notes</p>
                    <ul className="ml-4 mt-1 list-disc space-y-1 text-teal-700">
                      <li>
                        If you experience severe symptoms, stop immediately and mark
                        the reintroduction as failed
                      </li>
                      <li>
                        The system will automatically analyze results on day 7
                      </li>
                      <li>
                        You can only have one active reintroduction at a time
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSubmitting}
                  disabled={!selectedFoodId || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Starting..." : "Start Reintroduction"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
