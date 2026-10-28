import { NextResponse } from "next/server";
import Stripe from "stripe";
import { log } from "@/lib/logger";
import { handleStripeEvent } from "@/lib/billing/stripe-webhook";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

/**
 * POST /api/billing/webhook — Stripe webhook handler
 *
 * Handles subscription lifecycle events to keep our DB in sync. Idempotent
 * per event id and order-independent (see lib/billing/stripe-webhook.ts).
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

    const outcome = await handleStripeEvent(event, getStripe());

    return NextResponse.json({ received: true, ...(outcome === "duplicate" && { duplicate: true }) });
  } catch (error) {
    log.error("Stripe webhook error", { error: error as Error });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
