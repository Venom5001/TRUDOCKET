export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("Stripe webhook missing signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (cause) {
    console.error("Stripe webhook signature verification failed", {
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.info("Stripe webhook received", { id: event.id, type: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (
          checkoutSession.mode === "subscription" &&
          checkoutSession.subscription
        ) {
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription as string
          );
          const userId =
            checkoutSession.metadata?.userId || subscription.metadata?.userId;

          if (userId) {
            await upsertSubscription(subscription, userId);
          } else {
            console.warn("Stripe webhook checkout.session.completed missing userId", {
              eventId: event.id,
            });
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );
        if ((customer as Stripe.DeletedCustomer).deleted) {
          break;
        }

        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: (customer as Stripe.Customer).id },
        });

        if (user) {
          await upsertSubscription(subscription, user.id);
        } else {
          console.warn("Stripe webhook subscription event has no matching user", {
            eventId: event.id,
            stripeCustomerId: (customer as Stripe.Customer).id,
          });
        }
        break;
      }
      default:
        console.info("Stripe webhook ignored unsupported event type", {
          id: event.id,
          type: event.type,
        });
        break;
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  userId: string
) {
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(
        subscription.items.data[0].current_period_end * 1000
      ),
      status: subscription.status,
    },
    update: {
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(
        subscription.items.data[0].current_period_end * 1000
      ),
      status: subscription.status,
    },
  });
}
