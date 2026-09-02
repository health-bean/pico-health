import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { log } from "@/lib/logger";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

/**
 * Map Stripe price IDs to subscription tiers.
 */
function tierFromPriceId(priceId: string): "basic" | "premium" {
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  return priceId === premiumPriceId ? "premium" : "basic";
}

/** Extract period dates from subscription item (Clover API) */
function getPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    start: item ? new Date(item.current_period_start * 1000) : null,
    end: item ? new Date(item.current_period_end * 1000) : null,
  };
}

/**
 * POST /api/billing/webhook — Stripe webhook handler
 *
 * Handles subscription lifecycle events to keep our DB in sync.
 * Must be excluded from auth middleware (no user session).
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      log.warn("Stripe webhook signature verification failed", {
        error: err as Error,
      });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        const stripeSub = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = stripeSub.items.data[0]?.price.id;
        const period = getPeriodDates(stripeSub);

        await db
          .insert(subscriptions)
          .values({
            userId,
            tier: tierFromPriceId(priceId ?? ""),
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: priceId,
            status: stripeSub.status,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
              tier: tierFromPriceId(priceId ?? ""),
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: stripeSub.id,
              stripePriceId: priceId,
              status: stripeSub.status,
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
              updatedAt: new Date(),
            },
          });

        log.info("Subscription created", { userId, tier: tierFromPriceId(priceId ?? "") });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const period = getPeriodDates(sub);

        await db
          .update(subscriptions)
          .set({
            tier: tierFromPriceId(priceId ?? ""),
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        log.info("Subscription updated", { subscriptionId: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            tier: "free",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        log.info("Subscription canceled", { subscriptionId: sub.id });
        break;
      }

      default:
        log.debug("Unhandled Stripe event", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("Stripe webhook error", { error: error as Error });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
