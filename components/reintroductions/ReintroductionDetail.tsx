"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Calendar, TrendingUp, TrendingDown, Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ReintroductionTrial } from "@/types";

interface ReintroductionDetailProps {
  reintroductionId: string;
  onClose?: () => void;
  onMarkPassed?: () => void;
  onMarkFailed?: () => void;
}

interface ReintroductionDetailData extends ReintroductionTrial {
  entries: Array<{
    id: string;
    date: string;
    phase: string;
  }>;
  symptoms: Array<{
    name: string;
    severity: number;
    date: string;
  }>;
  analysis?: {
    symptomIncrease: boolean;
    avgSeverityDuringTest: number;
    avgSeverityBaseline: number;
    recommendation: string;
  };
}

export function ReintroductionDetail({
  reintroductionId,
  onClose,
  onMarkPassed,
  onMarkFailed,
}: ReintroductionDetailProps) {
  const [data, setData] = useState<ReintroductionDetailData | null>(null);
  const [verdict, setVerdict] = useState<"passed" | "failed" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [reintroductionId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reintroductions/${reintroductionId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch details");
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching reintroduction details:", err);
      setError(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactElement> = {
      active: (
        <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
          Active
        </span>
      ),
      passed: (
        <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
          Passed
        </span>
      ),
      failed: (
        <span className="inline-flex items-center rounded-full bg-danger/10 px-3 py-1 text-sm font-medium text-danger-strong">
          Failed
        </span>
      ),
      inconclusive: (
        <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning-strong">
          Inconclusive
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center rounded-full bg-warm-100 px-3 py-1 text-sm font-medium text-warm-800">
          Cancelled
        </span>
      ),
    };

    return badges[status] || null;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-sm text-warm-600">Loading details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-strong" />
          <div>
            <h3 className="text-sm font-semibold text-danger-strong">Error Loading Details</h3>
            <p className="mt-1 text-sm text-danger-strong">{error || "Failed to load reintroduction details"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-warm-900">{data.foodName}</h2>
          <p className="mt-1 text-sm text-warm-600">Reintroduction Details</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(data.status)}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-warm-500 hover:bg-warm-100 hover:text-warm-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-6">
        <h3 className="mb-4 text-base font-semibold text-warm-900">Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-warm-500" />
            <span className="text-warm-600">Started:</span>
            <span className="font-medium text-warm-900">{formatDate(data.startDate)}</span>
          </div>
          {data.endDate && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-warm-500" />
              <span className="text-warm-600">Ended:</span>
              <span className="font-medium text-warm-900">{formatDate(data.endDate)}</span>
            </div>
          )}
          {data.status === "active" && (
            <div className="flex items-center gap-3 text-sm">
              <Activity className="h-4 w-4 text-teal-500" />
              <span className="text-warm-600">Current Phase:</span>
              <span className="font-medium text-teal-600">
                {data.currentPhase === "testing" ? "Testing" : "Observation"} (Day {data.currentDay || 1})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Food Logs */}
      <div className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-6">
        <h3 className="mb-4 text-base font-semibold text-warm-900">Food Logs</h3>
        {data.entries.length === 0 ? (
          <p className="text-sm text-warm-600">No food logs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-warm-100 bg-warm-50 px-4 py-2"
              >
                <span className="text-sm text-warm-700">{formatDate(entry.date)}</span>
                <span className="text-xs text-warm-500">{entry.phase} phase</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symptoms */}
      <div className="rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-6">
        <h3 className="mb-4 text-base font-semibold text-warm-900">Symptoms Tracked</h3>
        {data.symptoms.length === 0 ? (
          <p className="text-sm text-warm-600">No symptoms recorded during this period.</p>
        ) : (
          <div className="space-y-3">
            {data.symptoms.map((symptom, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-warm-900">{symptom.name}</div>
                  <div className="text-xs text-warm-500">{formatDate(symptom.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-warm-200">
                    <div
                      className="h-full rounded-full bg-danger"
                      style={{ width: `${(symptom.severity / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-warm-700">{symptom.severity}/10</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis */}
      {data.analysis && (
        <div className={`rounded-xl border p-6 ${
          data.analysis.symptomIncrease
            ? "border-danger/30 bg-danger/10"
            : "border-teal-200 bg-teal-50"
        }`}>
          <div className="flex items-start gap-3">
            {data.analysis.symptomIncrease ? (
              <TrendingUp className="h-5 w-5 shrink-0 text-danger-strong" />
            ) : (
              <TrendingDown className="h-5 w-5 shrink-0 text-teal-600" />
            )}
            <div className="flex-1">
              <h3 className={`text-base font-semibold ${
                data.analysis.symptomIncrease ? "text-danger-strong" : "text-teal-900"
              }`}>
                Analysis Results
              </h3>
              <p className={`mt-2 text-sm ${
                data.analysis.symptomIncrease ? "text-danger-strong" : "text-teal-700"
              }`}>
                {data.analysis.recommendation}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-warm-600">Baseline Severity:</span>
                  <span className="ml-2 font-medium text-warm-900">
                    {data.analysis.avgSeverityBaseline.toFixed(1)}/10
                  </span>
                </div>
                <div>
                  <span className="text-warm-600">During Test:</span>
                  <span className="ml-2 font-medium text-warm-900">
                    {data.analysis.avgSeverityDuringTest.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outcome */}
      {data.outcome && (
        <div className="rounded-xl border border-warm-200 bg-warm-50 p-6">
          <h3 className="mb-2 text-base font-semibold text-warm-900">Outcome</h3>
          <p className="text-sm text-warm-700">{data.outcome}</p>
        </div>
      )}

      {/* Verdict: a real decision, so it is named and confirmed */}
      {data.status === "active" && data.currentDay && data.currentDay >= 7 && (
        <div className="flex flex-col gap-3 border-t border-warm-200 pt-6 sm:flex-row">
          {onMarkPassed && (
            <Button onClick={() => setVerdict("passed")} className="flex-1">
              Record as passed
            </Button>
          )}
          {onMarkFailed && (
            <Button variant="outline-danger" onClick={() => setVerdict("failed")} className="flex-1">
              Record as failed
            </Button>
          )}
        </div>
      )}

      <Dialog
        open={verdict !== null}
        onClose={() => setVerdict(null)}
        title={verdict === "passed" ? `Record ${data.foodName} as passed?` : `Record ${data.foodName} as failed?`}
        size="sm"
      >
        <p className="text-sm text-warm-600">
          {verdict === "passed"
            ? "This closes the trial and marks the food as tolerated. You can run another trial with it later."
            : "This closes the trial and marks the food as not tolerated for now. You can test it again later."}
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setVerdict(null)} className="w-full sm:w-auto">
            Not yet
          </Button>
          <Button
            variant={verdict === "failed" ? "outline-danger" : "primary"}
            onClick={() => {
              const fn = verdict === "passed" ? onMarkPassed : onMarkFailed;
              setVerdict(null);
              fn?.();
            }}
            className="w-full sm:w-auto"
          >
            {verdict === "passed" ? "Record as passed" : "Record as failed"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
