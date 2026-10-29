import { describe, it, expect, beforeEach, vi } from "vitest";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeWebhookEvents } from "@/lib/db/schema";
import { handleStripeEvent, storedStatus } from "./stripe-webhook";

vi.mock("@/lib/db");

function sub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub_1",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_basic" }, current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function event(type: string, object: unknown, id = "evt_1", created = 1_700_000_000) {
  return { id, type, created, data: { object } } as unknown as Stripe.Event;
}

/** Mocks db.insert for both the event claim and the subscription upsert. */
function mockDb({ claimed = true } = {}) {
  const setCalls: Record<string, unknown>[] = [];
  const upserts: Record<string, unknown>[] = [];
  vi.mocked(db.insert).mockImplementation(((table: unknown) => {
    const isClaim = table === stripeWebhookEvents;
    return {
      values: vi.fn((v: Record<string, unknown>) => {
        if (isClaim) {
          return { onConflictDoNothing: () => ({ returning: async () => (claimed ? [{ id: v.id }] : []) }) };
        }
        upserts.push(v);
        return { onConflictDoUpdate: vi.fn(async () => undefined) };
      }),
    };
  }) as never);
  vi.mocked(db.update).mockReturnValue({
    set: vi.fn((v: Record<string, unknown>) => {
      setCalls.push(v);
      return { where: vi.fn(async () => undefined) };
    }),
  } as never);
  const deleteWhere = vi.fn(async () => undefined);
  vi.mocked(db.delete).mockReturnValue({ where: deleteWhere } as never);
  return { setCalls, upserts, deleteWhere };
}

describe("handleStripeEvent", () => {
  let stripe: { subscriptions: { retrieve: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    stripe = { subscriptions: { retrieve: vi.fn() } };
  });

  it("skips an event id it has already processed", async () => {
    mockDb({ claimed: false });
    const out = await handleStripeEvent(event("customer.subscription.updated", sub()), stripe as never);
    expect(out).toBe("duplicate");
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("writes the subscription's current state, not a stale event payload", async () => {
    const { setCalls } = mockDb();
    // Older event says past_due; Stripe now says active.
    stripe.subscriptions.retrieve.mockResolvedValue(sub({ status: "active" }));
    const out = await handleStripeEvent(
      event("customer.subscription.updated", sub({ status: "past_due" })),
      stripe as never
    );
    expect(out).toBe("processed");
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");
    expect(setCalls[0]).toMatchObject({ status: "active", tier: "basic" });
  });

  it("an out-of-order update after deletion keeps the subscription canceled", async () => {
    const { setCalls } = mockDb();
    stripe.subscriptions.retrieve.mockResolvedValue(sub({ status: "canceled" }));
    await handleStripeEvent(event("customer.subscription.updated", sub({ status: "active" }), "evt_old"), stripe as never);
    expect(setCalls[0]).toMatchObject({ status: "canceled", tier: "free" });
  });

  it("deleted is applied from the payload (terminal)", async () => {
    const { setCalls } = mockDb();
    await handleStripeEvent(event("customer.subscription.deleted", sub()), stripe as never);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(setCalls[0]).toMatchObject({ status: "canceled", tier: "free" });
  });

  it("checkout.session.completed upserts from the re-fetched subscription", async () => {
    const { upserts } = mockDb();
    stripe.subscriptions.retrieve.mockResolvedValue(sub({ status: "trialing" }));
    await handleStripeEvent(
      event("checkout.session.completed", { metadata: { userId: "u1" }, subscription: "sub_1", customer: "cus_1" }),
      stripe as never
    );
    expect(upserts[0]).toMatchObject({ userId: "u1", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", status: "trialing" });
  });

  it("releases the claim when processing fails so Stripe can retry", async () => {
    const { deleteWhere } = mockDb();
    stripe.subscriptions.retrieve.mockRejectedValue(new Error("stripe down"));
    await expect(
      handleStripeEvent(event("customer.subscription.updated", sub()), stripe as never)
    ).rejects.toThrow("stripe down");
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("ignores unhandled event types without claiming them", async () => {
    mockDb();
    expect(await handleStripeEvent(event("invoice.paid", {}), stripe as never)).toBe("ignored");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("maps Stripe statuses onto the CHECK-constrained set", () => {
    expect(storedStatus("active")).toBe("active");
    expect(storedStatus("past_due")).toBe("past_due");
    expect(storedStatus("unpaid")).toBe("canceled");
    expect(storedStatus("incomplete")).toBe("canceled");
    expect(storedStatus("paused")).toBe("canceled");
  });
});
