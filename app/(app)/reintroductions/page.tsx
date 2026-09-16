"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, Dialog, Spinner, PageTitle } from "@/components/ui";
import { ReintroductionCard } from "@/components/reintroductions/ReintroductionCard";
import { ReintroductionHistory } from "@/components/reintroductions/ReintroductionHistory";
import { ReintroductionDetail } from "@/components/reintroductions/ReintroductionDetail";
import { ReintroductionRecommendations } from "@/components/reintroductions/ReintroductionRecommendations";
import { StartReintroductionModal } from "@/components/reintroductions/StartReintroductionModal";
import type { ReintroductionTrial } from "@/types";

type ViewMode = "overview" | "detail" | "recommendations";

export default function ReintroductionsPage() {
  const [activeReintroduction, setActiveReintroduction] = useState<ReintroductionTrial | null>(null);
  const [selectedReintroduction, setSelectedReintroduction] = useState<ReintroductionTrial | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stopOpen, setStopOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's protocol
      const userRes = await fetch("/api/users/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setProtocolId(userData.user?.currentProtocolId || null);
      }

      // Fetch active reintroduction
      const reintroRes = await fetch("/api/reintroductions");
      if (reintroRes.ok) {
        const reintroData = await reintroRes.json();
        const active = reintroData.reintroductions?.find(
          (r: ReintroductionTrial) => r.status === "active"
        );
        setActiveReintroduction(active || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (reintroduction: ReintroductionTrial) => {
    setSelectedReintroduction(reintroduction);
    setViewMode("detail");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedReintroduction(null);
  };

  const handleStartReintroduction = () => {
    if (!protocolId) {
      setErrorMessage("Please select a protocol first in your settings.");
      return;
    }
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchData(); // Refresh data
  };

  const handleStopReintroduction = async () => {
    if (!activeReintroduction) return;
    setStopOpen(false);

    try {
      const response = await fetch(`/api/reintroductions/${activeReintroduction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (response.ok) {
        setErrorMessage(null);
        fetchData();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to stop reintroduction");
      }
    } catch (error) {
      console.error("Error stopping reintroduction:", error);
      setErrorMessage("Failed to stop reintroduction");
    }
  };

  const handleMarkPassed = async () => {
    if (!selectedReintroduction) return;

    try {
      const response = await fetch(`/api/reintroductions/${selectedReintroduction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_passed" }),
      });

      if (response.ok) {
        setErrorMessage(null);
        handleBackToOverview();
        fetchData();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to mark as passed");
      }
    } catch (error) {
      console.error("Error marking as passed:", error);
      setErrorMessage("Failed to mark as passed");
    }
  };

  const handleMarkFailed = async () => {
    if (!selectedReintroduction) return;

    try {
      const response = await fetch(`/api/reintroductions/${selectedReintroduction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_failed" }),
      });

      if (response.ok) {
        setErrorMessage(null);
        handleBackToOverview();
        fetchData();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to mark as failed");
      }
    } catch (error) {
      console.error("Error marking as failed:", error);
      setErrorMessage("Failed to mark as failed");
    }
  };

  const handleSelectRecommendedFood = () => {
    // This would open the modal with the food pre-selected
    // For now, just open the modal
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        {viewMode !== "overview" && (
          <button
            onClick={handleBackToOverview}
            className="mb-4 flex items-center gap-2 text-sm text-warm-600 hover:text-warm-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </button>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <PageTitle>
              {viewMode === "overview" && "Reintroductions"}
              {viewMode === "detail" && "This trial"}
              {viewMode === "recommendations" && "Ready to try"}
            </PageTitle>
            <p className="mt-1 text-sm text-warm-600">
              {viewMode === "overview" && "Test a food back in over a few days and record how you react."}
              {viewMode === "detail" && "How the days went, entry by entry."}
              {viewMode === "recommendations" && "Foods you have avoided long enough to test."}
            </p>
            {viewMode === "overview" && (
              <button
                type="button"
                onClick={() => setViewMode("recommendations")}
                className="-ml-2 mt-1 min-h-11 rounded-lg px-2 text-sm font-medium text-teal-600 hover:bg-teal-50 hover:text-teal-700"
              >
                See which foods are ready to try
              </button>
            )}
          </div>
          {viewMode === "overview" && (
            protocolId ? (
              <Button
                onClick={handleStartReintroduction}
                disabled={!!activeReintroduction}
                className="w-full shrink-0 sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Start a reintroduction
              </Button>
            ) : (
              <Link
                href="/settings"
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-teal-200 px-4 text-sm font-medium text-teal-700 hover:bg-teal-50 sm:w-auto"
              >
                Choose a protocol in Settings first
              </Link>
            )
          )}
        </div>
      </div>

      <Dialog open={stopOpen} onClose={() => setStopOpen(false)} title="Stop this reintroduction?" size="sm">
        <p className="text-sm text-warm-600">
          The days you have logged so far stay in your history. You can start a new trial with this food any time.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setStopOpen(false)} className="w-full sm:w-auto">
            Keep going
          </Button>
          <Button variant="primary" onClick={handleStopReintroduction} className="w-full sm:w-auto">
            Stop trial
          </Button>
        </div>
      </Dialog>

      {/* Error message */}
      {errorMessage && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-surface-overlay)] px-4 py-3 text-sm text-[var(--color-danger)]">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="-mr-2 min-h-11 shrink-0 px-2 text-sm font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {viewMode === "overview" && (
        <div className="space-y-8">
          {/* Active Reintroduction */}
          {activeReintroduction && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-warm-900">Active reintroduction</h2>
              <ReintroductionCard
                reintroduction={activeReintroduction}
                onStop={() => setStopOpen(true)}
                onViewDetails={() => handleViewDetails(activeReintroduction)}
              />
            </div>
          )}

          {/* History */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-warm-900">History</h2>
            <ReintroductionHistory onViewDetails={handleViewDetails} />
          </div>
        </div>
      )}

      {viewMode === "detail" && selectedReintroduction && (
        <ReintroductionDetail
          reintroductionId={selectedReintroduction.id}
          onClose={handleBackToOverview}
          onMarkPassed={handleMarkPassed}
          onMarkFailed={handleMarkFailed}
        />
      )}

      {viewMode === "recommendations" && protocolId && (
        <ReintroductionRecommendations
          protocolId={protocolId}
          onSelectFood={handleSelectRecommendedFood}
        />
      )}

      {/* Start Reintroduction Modal */}
      {protocolId && (
        <StartReintroductionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          protocolId={protocolId}
        />
      )}
    </div>
  );
}
