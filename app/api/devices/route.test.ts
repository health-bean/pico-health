import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, DELETE } from "./route";
import { getSessionFromCookies } from "@/lib/auth/session";
import { upsertDeviceToken, deleteDeviceToken } from "@/lib/db/queries/push";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/db/queries/push");

const session = (userId: string) =>
  vi.mocked(getSessionFromCookies).mockResolvedValue({ userId } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
const req = (method: string, body: unknown) =>
  new Request("http://localhost/api/devices", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const token = "a".repeat(64);

describe("/api/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session("user-1");
  });

  it("requires a session to register or remove", async () => {
    session("");
    expect((await POST(req("POST", { token, platform: "ios" }))).status).toBe(401);
    expect((await DELETE(req("DELETE", { token }))).status).toBe(401);
    expect(upsertDeviceToken).not.toHaveBeenCalled();
  });

  it("rejects an unknown platform", async () => {
    expect((await POST(req("POST", { token, platform: "web" }))).status).toBe(400);
  });

  it("registers and removes for the signed-in user only", async () => {
    expect((await POST(req("POST", { token, platform: "android" }))).status).toBe(200);
    expect(upsertDeviceToken).toHaveBeenCalledWith("user-1", token, "android");
    expect((await DELETE(req("DELETE", { token }))).status).toBe(200);
    expect(deleteDeviceToken).toHaveBeenCalledWith("user-1", token);
  });
});
