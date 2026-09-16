"use client";

import { Calendar, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReintroductionTrial } from "@/types";

interface ReintroductionCardProps {
  reintroduction: ReintroductionTrial;
  onStop?: () => void;
  onViewDetails?: () => void;
}

export function ReintroductionCard({
  reintroduction,
  onStop,
  onViewDetails,
}: ReintroductionCardProps) {
  const currentDay = reintroduction.currentDay || 1;
  const currentPhase = reintroduction.currentPhase || "testing";
  const progress = Math.min((currentDay / 7) * 100, 100);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPhaseInfo = () => {
    if (currentPhase === "testing") {
      return {
        title: "Testing Phase",
        description: "Log this food daily and monitor symptoms",
        icon: <Clock className="h-5 w-5 text-teal-600" />,
        color: "teal",
      };
    } else if (currentPhase === "observation") {
      return {
        title: "Observation Phase",
        description: "Avoid this food and continue monitoring symptoms",
        icon: <AlertCircle className="h-5 w-5 text-warning-strong" />,
        color: "amber",
      };
    } else {
      return {
        title: "Complete",
        description: "Ready for analysis",
        icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
        color: "green",
      };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-warm-200 bg-gradient-to-r from-teal-50 to-teal-50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-warm-900">
              {reintroduction.foodName}
            </h3>
            <p className="mt-1 text-sm text-warm-600">
              Active reintroduction
            </p>
          </div>
          <div className="flex items-center gap-2">
            {phaseInfo.icon}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-warm-700">Day {currentDay} of 7</span>
          <span className="text-warm-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-warm-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase Info */}
      <div className={`border-t border-warm-200 bg-${phaseInfo.color}-50 p-4`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0">{phaseInfo.icon}</div>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold text-${phaseInfo.color}-900`}>
              {phaseInfo.title}
            </h4>
            <p className={`mt-1 text-sm text-${phaseInfo.color}-700`}>
              {phaseInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm text-warm-600">
          <Calendar className="h-4 w-4" />
          <span>Started: {formatDate(reintroduction.startDate)}</span>
        </div>

        {reintroduction.lastLogDate && (
          <div className="flex items-center gap-2 text-sm text-warm-600">
            <Clock className="h-4 w-4" />
            <span>Last logged: {formatDate(reintroduction.lastLogDate)}</span>
          </div>
        )}

        {reintroduction.missedDays && reintroduction.missedDays > 0 && (
          <div className="flex items-center gap-2 text-sm text-warning-strong">
            <AlertCircle className="h-4 w-4" />
            <span>{reintroduction.missedDays} missed day{reintroduction.missedDays > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-warm-200 p-4">
        {onViewDetails && (
          <Button
            onClick={onViewDetails}
            className="flex-1"
          >
            View Details
          </Button>
        )}
        {onStop && (
          <Button
            onClick={onStop}
            className="border-danger/30 text-danger-strong hover:bg-danger/10"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}
      </div>
    </Card>
  );
}
