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
import type { ReintroductionNotification } from "@/lib/notifications/reintroduction";

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

  const getNotificationIcon = (type: ReintroductionNotification["type"]) => {
    switch (type) {
      case "testing_reminder":
        return "🍽️";
      case "observation_reminder":
        return "👀";
      case "analysis_ready":
        return "✅";
      case "missed_days_warning":
        return "⚠️";
      case "missed_days_action":
        return "🚨";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: ReintroductionNotification["type"]) => {
    switch (type) {
      case "testing_reminder":
        return "bg-teal-50 border-teal-200";
      case "observation_reminder":
        return "bg-purple-50 border-purple-200";
      case "analysis_ready":
        return "bg-emerald-50 border-emerald-200";
      case "missed_days_warning":
        return "bg-yellow-50 border-yellow-200";
      case "missed_days_action":
        return "bg-red-50 border-red-200";
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
      <div className="p-4 text-center text-red-600">
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
              <span className="text-2xl" role="img" aria-label="notification icon">
                {getNotificationIcon(notification.type)}
              </span>
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
              onClick={() => dismissNotification(notification.reintroductionId)}
              className="text-warm-500 hover:text-warm-600 ml-2"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>

          {notification.actionRequired && (
            <div className="mt-3 flex space-x-2">
              {notification.type === "analysis_ready" && (
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium">
                  View Analysis
                </button>
              )}
              {notification.type === "missed_days_action" && (
                <>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium">
                    Extend Trial
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
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
