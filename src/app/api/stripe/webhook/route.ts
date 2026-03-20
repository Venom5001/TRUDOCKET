import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

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
          checkoutSession.metadata?.userId ||
          subscription.metadata?.userId;

        if (userId) {
          await upsertSubscription(subscription, userId);
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(
        subscription.customer as string
      );
      if ((customer as Stripe.DeletedCustomer).deleted) break;

      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: (customer as Stripe.Customer).id },
      });

      if (user) {
        await upsertSubscription(subscription, user.id);
      }
      break;
    }
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
