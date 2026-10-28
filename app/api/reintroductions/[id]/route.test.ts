import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";

// Mock dependencies
vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");

describe("GET /api/reintroductions/[id]", () => {
  const mockUserId = "user-123";
  const mockReintroductionId = "55555555-5555-4555-8555-555555555555";
  const mockStartDate = "2024-01-01";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: mockUserId,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    const request = new Request("http://localhost/api/reintroductions/123");
    const response = await GET(request, { params: { id: "123" } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Not authenticated");
  });

  it("should return 404 if reintroduction not found", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`
    );
    const response = await GET(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Reintroduction not found");
  });

  it("should return reintroduction with entries and symptoms", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      protocolId: "protocol-123",
      foodId: "food-123",
      foodName: "Tomatoes",
      startDate: mockStartDate,
      endDate: null,
      status: "active",
      currentPhase: "testing",
      currentDay: 2,
      analysisDate: null,
    };

    const mockLinkedEntries = [
      {
        entry: {
          id: "entry-1",
          userId: mockUserId,
          entryType: "food",
          name: "Tomatoes",
          entryDate: "2024-01-01",
          entryTime: "12:00:00",
        },
        phase: "testing",
      },
      {
        entry: {
          id: "entry-2",
          userId: mockUserId,
          entryType: "food",
          name: "Tomatoes",
          entryDate: "2024-01-02",
          entryTime: "12:00:00",
        },
        phase: "testing",
      },
    ];

    const mockSymptoms = [
      {
        id: "symptom-1",
        userId: mockUserId,
        entryType: "symptom",
        name: "Headache",
        severity: 3,
        entryDate: "2024-01-02",
        entryTime: "14:00:00",
      },
    ];

    // Mock the database queries
    let queryCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) {
        // First query: fetch reintroduction
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockReintroduction]),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      } else if (queryCount === 2) {
        // Second query: fetch linked entries
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockLinkedEntries),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      } else {
        // Third query: fetch symptoms
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockSymptoms),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      }
    });

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`
    );
    const response = await GET(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.reintroduction).toEqual(mockReintroduction);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].phase).toBe("testing");
    expect(data.symptoms).toHaveLength(1);
    expect(data.analysis.totalEntries).toBe(2);
    expect(data.analysis.testingPhaseEntries).toBe(2);
    expect(data.analysis.totalSymptoms).toBe(1);
    expect(data.analysis.symptomsByType).toEqual({ Headache: 1 });
  });

  it("should include baseline comparison when analysis is complete", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      protocolId: "protocol-123",
      foodId: "food-123",
      foodName: "Tomatoes",
      startDate: mockStartDate,
      endDate: "2024-01-08",
      status: "passed",
      currentPhase: "complete",
      currentDay: 7,
      analysisDate: "2024-01-08",
      analysisNotes: "No significant symptoms detected",
    };

    const mockLinkedEntries = [
      {
        entry: {
          id: "entry-1",
          userId: mockUserId,
          entryType: "food",
          name: "Tomatoes",
          entryDate: "2024-01-01",
        },
        phase: "testing",
      },
    ];

    const mockSymptoms = [
      {
        id: "symptom-1",
        userId: mockUserId,
        entryType: "symptom",
        name: "Headache",
        entryDate: "2024-01-02",
      },
    ];

    const mockBaselineSymptoms = [
      {
        id: "symptom-baseline-1",
        userId: mockUserId,
        entryType: "symptom",
        name: "Headache",
        entryDate: "2023-12-26",
      },
      {
        id: "symptom-baseline-2",
        userId: mockUserId,
        entryType: "symptom",
        name: "Fatigue",
        entryDate: "2023-12-27",
      },
    ];

    // Mock the database queries
    let queryCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockReintroduction]),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      } else if (queryCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockLinkedEntries),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      } else if (queryCount === 3) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockSymptoms),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      } else {
        // Fourth query: fetch baseline symptoms
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockBaselineSymptoms),
          }),
        } as unknown as ReturnType<typeof db.select>;
      }
    });

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`
    );
    const response = await GET(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.analysis.baseline).toBeDefined();
    expect(data.analysis.baseline.baselineSymptomCount).toBe(2);
    expect(data.analysis.baseline.testSymptomCount).toBe(1);
    expect(data.analysis.baseline.symptomFrequencyBefore).toBeCloseTo(2 / 7);
    expect(data.analysis.baseline.symptomFrequencyDuring).toBeCloseTo(1 / 7);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("Database error");
    });

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`
    );
    const response = await GET(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});

describe("PATCH /api/reintroductions/[id]", () => {
  const mockUserId = "user-123";
  const mockReintroductionId = "55555555-5555-4555-8555-555555555555";
  const mockStartDate = "2024-01-01";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: mockUserId,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue({
      userId: null,
    } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }
    );
    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Not authenticated");
  });

  it("should return 400 for invalid action", async () => {
    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "invalid_action" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid action");
  });

  it("should return 404 if reintroduction not found", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Reintroduction not found");
  });

  it("should stop an active reintroduction", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      protocolId: "protocol-123",
      foodId: "food-123",
      foodName: "Tomatoes",
      startDate: mockStartDate,
      status: "active",
      currentPhase: "testing",
      currentDay: 2,
    };

    const mockUpdated = {
      ...mockReintroduction,
      status: "cancelled",
      cancellationDate: "2024-01-03",
      cancellationReason: "User stopped reintroduction",
      endDate: "2024-01-03",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.reintroduction.status).toBe("cancelled");
    expect(data.reintroduction.cancellationDate).toBeDefined();
  });

  it("should stop with custom reason", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "active",
    };

    const customReason = "Severe reaction observed";
    const mockUpdated = {
      ...mockReintroduction,
      status: "cancelled",
      cancellationReason: customReason,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop", reason: customReason }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reintroduction.cancellationReason).toBe(customReason);
  });

  it("should return 400 when trying to stop non-active reintroduction", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "passed",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Can only stop active reintroductions");
  });

  it("should mark reintroduction as failed", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "active",
    };

    const mockUpdated = {
      ...mockReintroduction,
      status: "failed",
      endDate: "2024-01-03",
      analysisDate: "2024-01-03",
      analysisNotes: "Manually marked as failed due to severe reactions",
      outcome: "Failed - manually marked by user",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "mark_failed" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.reintroduction.status).toBe("failed");
    expect(data.reintroduction.analysisDate).toBeDefined();
  });

  it("should mark reintroduction as passed", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "active",
    };

    const mockUpdated = {
      ...mockReintroduction,
      status: "passed",
      endDate: "2024-01-03",
      analysisDate: "2024-01-03",
      analysisNotes: "Manually marked as passed by user",
      outcome: "Passed - manually marked by user",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "mark_passed" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.reintroduction.status).toBe("passed");
  });

  it("should extend an active reintroduction", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "active",
      currentDay: 5,
      currentPhase: "observation",
    };

    const mockUpdated = {
      ...mockReintroduction,
      currentDay: 8,
      currentPhase: "observation",
      analysisNotes: "Extended observation period.",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "extend" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.reintroduction.currentDay).toBe(8);
  });

  it("should extend an inconclusive reintroduction", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "inconclusive",
      currentDay: 7,
    };

    const mockUpdated = {
      ...mockReintroduction,
      status: "active",
      currentDay: 10,
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    } as unknown as ReturnType<typeof db.update>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "extend" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reintroduction.status).toBe("active");
  });

  it("should return 400 when extending non-active/non-inconclusive reintroduction", async () => {
    const mockReintroduction = {
      id: mockReintroductionId,
      userId: mockUserId,
      status: "passed",
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockReintroduction]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "extend" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Can only extend active or inconclusive reintroductions"
    );
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("Database error");
    });

    const request = new Request(
      `http://localhost/api/reintroductions/${mockReintroductionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(request, {
      params: { id: mockReintroductionId },
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
