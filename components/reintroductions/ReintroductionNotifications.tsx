"use client";

/**
 * Reintroduction Notifications Component
 * 
 * Displays notifications for active reintroductions:
 * - Daily reminders to log food (testing phase)
 * - Daily reminders to avoid food (observation phase)
 * - Analysis ready notification
 * - Missed days warnings and actions
 */

import { useEffect, useState } from "react";
import {
  AlertCircle, AlertTriangle, Bell, CheckCircle2, Eye, Utensils, X, type LucideIcon,
} from "lucide-react";
import type { ReintroductionNotification } from "@/lib/notifications/reintroduction";

function NotificationIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-card)] text-warm-700 ring-1 ring-inset ring-warm-200/60">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

interface NotificationSummary {
  total: number;
  actionRequired: number;
  byType: Record<string, number>;
}

interface NotificationsResponse {
  notifications: ReintroductionNotification[];
  summary: NotificationSummary;
  preferences: {
    enableTestingReminders: boolean;
    enableObservationReminders: boolean;
    enableMissedDaysWarnings: boolean;
  };
}

export function ReintroductionNotifications() {
  const [notifications, setNotifications] = useState<ReintroductionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual auth header
      const response = await fetch("/api/reintroductions/notifications", {
        headers: {
          "x-user-id": "temp-user-id", // Placeholder
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.reintroductionId !== notificationId)
    );
  };

  const getNotificationIcon = (type: ReintroductionNotification["type"]): LucideIcon => {
    switch (type) {
      case "testing_reminder":
        return Utensils;
      case "observation_reminder":
        return Eye;
      case "analysis_ready":
        return CheckCircle2;
      case "missed_days_warning":
        return AlertTriangle;
      case "missed_days_action":
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: ReintroductionNotification["type"]) => {
    switch (type) {
      case "testing_reminder":
        return "bg-teal-50 border-teal-200";
      case "observation_reminder":
        return "bg-teal-50 border-teal-200";
      case "analysis_ready":
        return "bg-teal-50 border-teal-200";
      case "missed_days_warning":
        return "bg-warning/10 border-warning/30";
      case "missed_days_action":
        return "bg-danger/10 border-danger/30";
      default:
        return "bg-warm-50 border-warm-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-warm-500">
        Loading notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-danger-strong">
        Error: {error}
      </div>
    );
  }

  if (notifications.length === 0) {
    return null; // Don't show anything if no notifications
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.reintroductionId}
          className={`p-4 rounded-lg border-2 ${getNotificationColor(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <NotificationIcon icon={getNotificationIcon(notification.type)} />
              <div className="flex-1">
                <h3 className="font-semibold text-warm-900">
                  {notification.title}
                </h3>
                <p className="text-sm text-warm-700 mt-1">
                  {notification.message}
                </p>
                {notification.metadata.missedDays !== undefined && (
                  <p className="text-xs text-warm-500 mt-2">
                    Missed days: {notification.metadata.missedDays}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissNotification(notification.reintroductionId)}
              className="-m-2 ml-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 hover:text-warm-700"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {notification.actionRequired && (
            <div className="mt-3 flex space-x-2">
              {notification.type === "analysis_ready" && (
                <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium">
                  View Analysis
                </button>
              )}
              {notification.type === "missed_days_action" && (
                <>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium">
                    Extend Trial
                  </button>
                  <button className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger text-sm font-medium">
                    Cancel Trial
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
