import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const PLANS = {
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY_ID!,
    price: "$9",
    interval: "month",
    features: ["Unlimited projects", "Priority support", "Advanced analytics"],
  },
} as const;

export function isPro(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
