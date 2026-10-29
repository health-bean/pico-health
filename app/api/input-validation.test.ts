/**
 * Bounds and malformed-input handling across routes that previously trusted
 * request bodies / path params. DB is mocked; nothing here touches Postgres.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth/session";
import { POST as createCustomFood } from "./foods/custom/route";
import { PATCH as patchCustomFood, DELETE as deleteCustomFood } from "./foods/custom/[id]/route";
import { POST as completeOnboarding } from "./onboarding/route";
import { POST as startProtocol, PATCH as advanceProtocol } from "./protocols/state/route";
import { GET as listTrials, POST as startTrial, PATCH as completeTrial } from "./protocols/reintroduction/route";
import { GET as getReintro } from "./reintroductions/[id]/route";
import { POST as adminProtocolsPost, PATCH as adminProtocolsPatch, DELETE as adminProtocolsDelete } from "./admin/protocols/route";
import { PATCH as adminUsersPatch } from "./admin/users/route";
import { POST as createEntry } from "./entries/route";
import { POST as createBatch } from "./entries/batch/route";
import { PATCH as dismissAlert } from "./insights/alerts/[id]/route";
import { GET as getProtocol } from "./protocols/[id]/route";

vi.mock("@/lib/db");
vi.mock("@/lib/auth/session");
vi.mock("@/lib/protocols/reintroduction", () => ({
  startReintroductionTrial: vi.fn(),
  completeReintroductionTrial: vi.fn(),
  getActiveTrials: vi.fn(),
  getTrialHistory: vi.fn(),
}));

const userId = "11111111-1111-4111-8111-111111111111";
const someId = "22222222-2222-4222-8222-222222222222";

function session(isAdmin = false) {
  vi.mocked(getSessionFromCookies).mockResolvedValue({
    userId,
    isAdmin,
  } as unknown as Awaited<ReturnType<typeof getSessionFromCookies>>);
}

const json = (method: string, body: unknown) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function expectNoWrites() {
  expect(db.insert).not.toHaveBeenCalled();
  expect(db.update).not.toHaveBeenCalled();
  expect(db.delete).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  session();
});

describe("custom foods", () => {
  it("POST rejects bad JSON, empty/oversized names and unknown property levels", async () => {
    for (const body of [
      "{oops",
      { displayName: "" },
      { displayName: "x".repeat(256) },
      { displayName: "Kale", category: "c".repeat(101) },
      { displayName: "Kale", properties: { oxalate: "extreme" } },
      { displayName: "Kale", properties: { nightshade: "yes" } },
    ]) {
      expect((await createCustomFood(json("POST", body))).status).toBe(400);
    }
    expectNoWrites();
  });

  it("[id] returns 404 for a non-uuid id without querying", async () => {
    expect((await patchCustomFood(json("PATCH", { displayName: "x" }), ctx("abc"))).status).toBe(404);
    expect((await deleteCustomFood(json("DELETE", {}), ctx("1 OR 1=1"))).status).toBe(404);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("onboarding / protocol state / reintroduction trials", () => {
  it("onboarding rejects a non-uuid protocolId and bad JSON", async () => {
    expect((await completeOnboarding(json("POST", { protocolId: "aip" }))).status).toBe(400);
    expect((await completeOnboarding(json("POST", "nope"))).status).toBe(400);
    expectNoWrites();
  });

  it("protocol state requires a uuid protocolId", async () => {
    expect((await startProtocol(json("POST", {}))).status).toBe(400);
    expect((await startProtocol(json("POST", { protocolId: "x" }))).status).toBe(400);
    expect((await advanceProtocol(json("PATCH", "{"))).status).toBe(400);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("reintroduction trials validate ids, status and sizes", async () => {
    expect((await listTrials(new Request("http://localhost/x?protocolId=bad"))).status).toBe(400);
    expect((await startTrial(json("POST", { protocolId: someId, foodName: "x".repeat(256) }))).status).toBe(400);
    expect((await startTrial(json("POST", { protocolId: "bad", foodName: "Eggs" }))).status).toBe(400);
    expect((await completeTrial(json("PATCH", { trialId: someId, status: "maybe" }))).status).toBe(400);
    expect(
      (await completeTrial(
        json("PATCH", { trialId: someId, status: "passed", symptomsSummary: { blob: "x".repeat(9000) } })
      )).status
    ).toBe(400);
  });

  it("reintroductions/[id] returns 404 for a non-uuid id", async () => {
    expect((await getReintro(new Request("http://localhost/x"), ctx("nope"))).status).toBe(404);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("other uuid path params", () => {
  it("alerts and protocols return 404 instead of a Postgres cast error", async () => {
    expect((await dismissAlert(json("PATCH", {}) as never, ctx("x"))).status).toBe(404);
    expect((await getProtocol(new Request("http://localhost/x"), ctx("x"))).status).toBe(404);
    expectNoWrites();
  });
});

describe("admin protocols / users", () => {
  beforeEach(() => session(true));

  it("validates actions, ids and lengths", async () => {
    expect((await adminProtocolsPost(json("POST", { action: "create_protocol", name: "" }))).status).toBe(400);
    expect((await adminProtocolsPost(json("POST", { action: "create_protocol", name: "n", category: "c".repeat(51) }))).status).toBe(400);
    expect((await adminProtocolsPost(json("POST", { action: "add_rule", protocolId: "x", ruleType: "t", status: "avoid" }))).status).toBe(400);
    expect((await adminProtocolsPost(json("POST", { action: "drop_tables" }))).status).toBe(400);
    expect((await adminProtocolsPatch(json("PATCH", { action: "update_rule", id: "x" }))).status).toBe(400);
    expect((await adminProtocolsDelete(json("DELETE", { action: "delete_protocol", id: "x" }))).status).toBe(400);
    expect((await adminProtocolsDelete(json("DELETE", "{"))).status).toBe(400);
    expect((await adminUsersPatch(json("PATCH", { userId: "x", isAdmin: true }))).status).toBe(400);
    expect((await adminUsersPatch(json("PATCH", { userId: someId, isAdmin: "yes" }))).status).toBe(400);
    expectNoWrites();
  });

  it("still 403s non-admins before reading the body", async () => {
    session(false);
    expect((await adminProtocolsPost(json("POST", "{"))).status).toBe(403);
  });
});

describe("entries structuredContent bound", () => {
  const big = { notes: "x".repeat(17 * 1024) };
  const entry = { entryType: "symptom", name: "Headache", entryDate: "2026-10-12" };

  it("POST /api/entries rejects oversized structuredContent and bad JSON", async () => {
    expect((await createEntry(json("POST", { ...entry, structuredContent: big }))).status).toBe(400);
    expect((await createEntry(json("POST", "{"))).status).toBe(400);
    expectNoWrites();
  });

  it("POST /api/entries/batch rejects oversized structuredContent", async () => {
    expect((await createBatch(json("POST", { entries: [{ ...entry, structuredContent: big }] }))).status).toBe(400);
    expectNoWrites();
  });
});
