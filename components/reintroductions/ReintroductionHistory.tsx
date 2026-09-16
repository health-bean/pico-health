"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Calendar, Clock } from "lucide-react";
import type { ReintroductionTrial, ReintroductionStatus } from "@/types";

interface ReintroductionHistoryProps {
  protocolId?: string; // Optional for future filtering by protocol
  onViewDetails?: (reintroduction: ReintroductionTrial) => void;
}

type FilterStatus = "all" | ReintroductionStatus;

export function ReintroductionHistory({
  protocolId,
  onViewDetails,
}: ReintroductionHistoryProps) {
  // Note: protocolId reserved for future protocol-specific filtering
  void protocolId;
  const [reintroductions, setReintroductions] = useState<ReintroductionTrial[]>([]);
  const [filteredReintroductions, setFilteredReintroductions] = useState<ReintroductionTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>("all");

  // Fetch reintroductions on mount
  useEffect(() => {
    fetchReintroductions();
  }, []);

  // Filter reintroductions when filter changes
  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredReintroductions(reintroductions);
    } else {
      setFilteredReintroductions(
        reintroductions.filter((r) => r.status === selectedFilter)
      );
    }
  }, [selectedFilter, reintroductions]);

  const fetchReintroductions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reintroductions");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reintroductions");
      }

      setReintroductions(data.reintroductions || []);
    } catch (err) {
      console.error("Error fetching reintroductions:", err);
      setError(err instanceof Error ? err.message : "Failed to load reintroductions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ReintroductionStatus) => {
    const badges = {
      active: (
        <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
          Active
        </span>
      ),
      passed: (
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
          Passed
        </span>
      ),
      failed: (
        <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger-strong">
          Failed
        </span>
      ),
      inconclusive: (
        <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-strong">
          Inconclusive
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-800">
          Cancelled
        </span>
      ),
    };

    return badges[status];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPhaseDisplay = (reintroduction: ReintroductionTrial) => {
    if (reintroduction.status !== "active") {
      return null;
    }

    const phase = reintroduction.currentPhase || "testing";
    const day = reintroduction.currentDay || 1;

    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-warm-600">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Day {day} of 7 • {phase === "testing" ? "Testing Phase" : "Observation Phase"}
        </span>
      </div>
    );
  };

  const handleCardClick = (reintroduction: ReintroductionTrial) => {
    if (onViewDetails) {
      onViewDetails(reintroduction);
    }
  };

  // Filter buttons
  const filters: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "passed", label: "Passed" },
    { value: "failed", label: "Failed" },
    { value: "inconclusive", label: "Inconclusive" },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-sm text-warm-600">Loading reintroductions...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-strong" />
          <div>
            <h3 className="text-sm font-semibold text-danger-strong">Error Loading Reintroductions</h3>
            <p className="mt-1 text-sm text-danger-strong">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (reintroductions.length === 0) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warm-100">
          <Calendar className="h-6 w-6 text-warm-500" />
        </div>
        <h3 className="text-base font-semibold text-warm-900">No Reintroductions Yet</h3>
        <p className="mt-2 text-sm text-warm-600">
          Start your first food reintroduction to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const count =
            filter.value === "all"
              ? reintroductions.length
              : reintroductions.filter((r) => r.status === filter.value).length;

          return (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedFilter === filter.value
                  ? "bg-teal-600 text-white"
                  : "bg-warm-100 text-warm-700 hover:bg-warm-200"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Reintroduction Cards */}
      {filteredReintroductions.length === 0 ? (
        <div className="rounded-xl border border-warm-200 bg-warm-50 p-6 text-center">
          <p className="text-sm text-warm-600">
            No reintroductions found with status: {selectedFilter}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReintroductions.map((reintroduction) => (
            <button
              key={reintroduction.id}
              onClick={() => handleCardClick(reintroduction)}
              className="group rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-4 text-left transition-all hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              {/* Food Name & Status */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-warm-900 group-hover:text-teal-600">
                  {reintroduction.foodName}
                </h3>
                {getStatusBadge(reintroduction.status)}
              </div>

              {/* Dates */}
              <div className="mt-3 space-y-1.5 text-xs text-warm-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Started: {formatDate(reintroduction.startDate)}</span>
                </div>
                {reintroduction.endDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Ended: {formatDate(reintroduction.endDate)}</span>
                  </div>
                )}
              </div>

              {/* Phase Info (for active reintroductions) */}
              {getPhaseDisplay(reintroduction)}

              {/* Outcome Summary (for completed reintroductions) */}
              {reintroduction.status !== "active" && reintroduction.outcome && (
                <p className="mt-3 line-clamp-2 text-xs text-warm-600">
                  {reintroduction.outcome}
                </p>
              )}

              {/* Click hint */}
              <div className="mt-3 text-xs text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                Click to view details →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
