import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { listDevices, entriesForDay, deleteDeadToken } from "@/lib/db/queries/push";
import { mergeIntoMeal } from "@/lib/db/queries/entries";
import { pushConfigured, sendPush } from "@/lib/push/send";

vi.mock("@/lib/db/queries/push");
vi.mock("@/lib/db/queries/entries");
vi.mock("@/lib/push/send", () => ({ pushConfigured: vi.fn(), sendPush: vi.fn() }));

const call = (auth?: string) =>
  GET(new Request("http://localhost/api/cron/checkin-reminders", { headers: auth ? { authorization: auth } : {} }));

describe("check-in reminder cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env.CRON_SECRET = "s3cret";
  });

  it("refuses anyone without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("does nothing until push credentials exist", async () => {
    vi.mocked(pushConfigured).mockReturnValue(false);
    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({ sent: 0, skipped: "no push credentials" });
    expect(listDevices).not.toHaveBeenCalled();
  });

  it("sends once per due meal, marks it, and drops dead tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 12, 18, 30))); // 14:30 in New York
    vi.mocked(pushConfigured).mockReturnValue(true);
    vi.mocked(listDevices).mockResolvedValue([
      { userId: "u1", token: "good", platform: "ios", timezone: "America/New_York" },
      { userId: "u1", token: "dead", platform: "android", timezone: "America/New_York" },
    ] as never);
    vi.mocked(entriesForDay).mockResolvedValue([
      { entryType: "food", name: "Salmon", entryTime: "12:40:00", mealType: "lunch", structuredContent: null },
    ] as never);
    vi.mocked(sendPush).mockImplementation(async (_p, token) => (token === "good" ? "sent" : "invalid"));

    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({ sent: 1, removed: 1 });
    expect(entriesForDay).toHaveBeenCalledWith("u1", "2026-10-12");
    expect(deleteDeadToken).toHaveBeenCalledWith("dead");
    expect(mergeIntoMeal).toHaveBeenCalledWith("u1", "2026-10-12", "12:40:00", expect.objectContaining({ checkinPushedAt: expect.any(String) }));
  });
});
