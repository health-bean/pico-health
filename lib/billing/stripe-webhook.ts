/**
 * Stripe webhook event handling, separated from the route so it can be tested
 * with a mocked Stripe client and DB.
 *
 * Guarantees:
 * - Idempotent: each event.id is claimed in stripe_webhook_events before it
 *   is processed; a redelivery of a claimed id is acknowledged and skipped.
 *   If processing throws, the claim is released so Stripe's retry runs again.
 * - Order-independent: Stripe does not guarantee delivery order, so we never
 *   write subscription state from the (possibly stale) event payload. We
 *   re-fetch the subscription from Stripe and write its *current* state.
 *   The one exception is customer.subscription.deleted, which is terminal.
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeWebhookEvents, subscriptions } from "@/lib/db/schema";
import { log } from "@/lib/logger";

type StripeClient = Pick<Stripe, "subscriptions">;

/** Map Stripe price IDs to subscription tiers. */
export function tierFromPriceId(priceId: string): "basic" | "premium" {
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  return priceId === premiumPriceId ? "premium" : "basic";
}

/**
 * subscriptions.status has a CHECK constraint (active, past_due, canceled,
 * trialing). Stripe has more statuses; anything that should not grant access
 * (incomplete, incomplete_expired, unpaid, paused) is stored as canceled, so
 * an unexpected status can't 500 the webhook forever or grant a paid tier.
 */
export function storedStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "trialing" {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
      return status;
    default:
      return "canceled";
  }
}

/** Period dates live on the subscription item (Clover API). */
function getPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    start: item ? new Date(item.current_period_start * 1000) : null,
    end: item ? new Date(item.current_period_end * 1000) : null,
  };
}

function subscriptionState(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id;
  const status = storedStatus(sub.status);
  const period = getPeriodDates(sub);
  return {
    tier: status === "canceled" ? ("free" as const) : tierFromPriceId(priceId ?? ""),
    stripePriceId: priceId,
    status,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/** Claim an event id. Returns false if it was already processed/claimed. */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  const claimed = await db
    .insert(stripeWebhookEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvents.id });
  return claimed.length > 0;
}

async function releaseEvent(eventId: string) {
  await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, eventId));
}

async function applyEvent(event: Stripe.Event, stripe: StripeClient) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) return;

      const subId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const stripeSub = await stripe.subscriptions.retrieve(subId);
      const state = subscriptionState(stripeSub);
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;

      await db
        .insert(subscriptions)
        .values({
          userId,
          stripeCustomerId: customer,
          stripeSubscriptionId: stripeSub.id,
          ...state,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            stripeCustomerId: customer,
            stripeSubscriptionId: stripeSub.id,
            ...state,
            updatedAt: new Date(),
          },
        });

      log.info("Subscription created", { userId, tier: state.tier });
      return;
    }

    case "customer.subscription.updated": {
      const eventSub = event.data.object as Stripe.Subscription;
      // Re-fetch: this event may be older than one we already applied.
      const sub = await stripe.subscriptions.retrieve(eventSub.id);
      const state = subscriptionState(sub);

      await db
        .update(subscriptions)
        .set({ ...state, updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      log.info("Subscription updated", { subscriptionId: sub.id, status: state.status });
      return;
    }

    case "customer.subscription.deleted": {
      // Terminal: a deleted subscription never becomes active again, so the
      // payload is safe to apply regardless of order.
      const sub = event.data.object as Stripe.Subscription;

      await db
        .update(subscriptions)
        .set({ status: "canceled", tier: "free", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      log.info("Subscription canceled", { subscriptionId: sub.id });
      return;
    }

    default:
      log.debug("Unhandled Stripe event", { type: event.type });
  }
}

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

/**
 * Process a verified Stripe event exactly once.
 * Returns "duplicate" if this event id was already handled.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  stripe: StripeClient
): Promise<"processed" | "duplicate" | "ignored"> {
  if (!HANDLED.has(event.type)) {
    log.debug("Unhandled Stripe event", { type: event.type });
    return "ignored";
  }

  if (!(await claimEvent(event))) {
    log.info("Duplicate Stripe event skipped", { eventId: event.id, type: event.type });
    return "duplicate";
  }

  try {
    await applyEvent(event, stripe);
    return "processed";
  } catch (error) {
    // Let Stripe's retry process it again.
    await releaseEvent(event.id).catch((releaseError) =>
      log.error("Failed to release Stripe event claim", {
        eventId: event.id,
        error: releaseError as Error,
      })
    );
    throw error;
  }
}
