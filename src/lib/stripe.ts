import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Missing required environment variable STRIPE_SECRET_KEY");
}

const stripePriceProMonthlyId = process.env.STRIPE_PRICE_PRO_MONTHLY_ID;
if (!stripePriceProMonthlyId) {
  throw new Error("Missing required environment variable STRIPE_PRICE_PRO_MONTHLY_ID");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
});

export const PLANS = {
  pro: {
    name: "Pro",
    priceId: stripePriceProMonthlyId,
    price: "$9",
    interval: "month",
    features: [
      "Unlimited motion generations",
      "Full document history",
      "Case management",
      "Priority support",
    ],
  },
} as const;

export function isPro(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
