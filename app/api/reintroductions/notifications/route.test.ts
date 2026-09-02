/**
 * Tests for Reintroduction Notifications API Route
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import * as notificationModule from "@/lib/notifications/reintroduction";
import { getSessionFromCookies } from "@/lib/auth/session";

vi.mock("@/lib/auth/session");

// Mock the notification module
vi.mock("@/lib/notifications/reintroduction", () => ({
  generateReintroductionNotifications: vi.fn(),
  shouldShowNotification: vi.fn(),
  getNotificationSummary: vi.fn(),
}));

describe("GET /api/reintroductions/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: "user-123",
      isAdmin: false,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
  });

  it("should return notifications for authenticated user", async () => {
    const mockNotifications = [
      {
        type: "testing_reminder" as const,
        reintroductionId: "reintro-1",
        userId: "user-123",
        title: "Log Your Reintroduction Food",
        message: "Day 2 of 7: Remember to eat Tomatoes today and log it.",
        actionRequired: false,
        metadata: {
          foodName: "Tomatoes",
          currentDay: 2,
          currentPhase: "testing",
        },
      },
    ];

    const mockSummary = {
      total: 1,
      actionRequired: 0,
      byType: {
        testing_reminder: 1,
        observation_reminder: 0,
        analysis_ready: 0,
        missed_days_warning: 0,
        missed_days_action: 0,
      },
    };

    vi.mocked(notificationModule.generateReintroductionNotifications).mockResolvedValue(
      mockNotifications
    );
    vi.mocked(notificationModule.shouldShowNotification).mockReturnValue(true);
    vi.mocked(notificationModule.getNotificationSummary).mockReturnValue(mockSummary);

    const request = new NextRequest("http://localhost:3000/api/reintroductions/notifications", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].type).toBe("testing_reminder");
    expect(data.summary).toEqual(mockSummary);
    expect(data.preferences).toBeDefined();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
    const request = new NextRequest("http://localhost:3000/api/reintroductions/notifications");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should filter notifications based on user preferences", async () => {
    const mockNotifications = [
      {
        type: "testing_reminder" as const,
        reintroductionId: "reintro-1",
        userId: "user-123",
        title: "Test",
        message: "Test",
        actionRequired: false,
        metadata: {
          foodName: "Food",
          currentDay: 1,
          currentPhase: "testing",
        },
      },
      {
        type: "observation_reminder" as const,
        reintroductionId: "reintro-2",
        userId: "user-123",
        title: "Test",
        message: "Test",
        actionRequired: false,
        metadata: {
          foodName: "Food",
          currentDay: 5,
          currentPhase: "observation",
        },
      },
    ];

    vi.mocked(notificationModule.generateReintroductionNotifications).mockResolvedValue(
      mockNotifications
    );
    
    // Mock shouldShowNotification to filter out observation reminders
    vi.mocked(notificationModule.shouldShowNotification).mockImplementation(
      (notification) => notification.type !== "observation_reminder"
    );

    vi.mocked(notificationModule.getNotificationSummary).mockReturnValue({
      total: 1,
      actionRequired: 0,
      byType: {
        testing_reminder: 1,
        observation_reminder: 0,
        analysis_ready: 0,
        missed_days_warning: 0,
        missed_days_action: 0,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/reintroductions/notifications", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].type).toBe("testing_reminder");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(notificationModule.generateReintroductionNotifications).mockRejectedValue(
      new Error("Database error")
    );

    const request = new NextRequest("http://localhost:3000/api/reintroductions/notifications", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch notifications");
  });

  it("should return empty array if no active reintroductions", async () => {
    vi.mocked(notificationModule.generateReintroductionNotifications).mockResolvedValue([]);
    vi.mocked(notificationModule.getNotificationSummary).mockReturnValue({
      total: 0,
      actionRequired: 0,
      byType: {
        testing_reminder: 0,
        observation_reminder: 0,
        analysis_ready: 0,
        missed_days_warning: 0,
        missed_days_action: 0,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/reintroductions/notifications", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(0);
    expect(data.summary.total).toBe(0);
  });
});
