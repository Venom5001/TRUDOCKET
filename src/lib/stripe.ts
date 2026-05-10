import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

let _client: Stripe | undefined;
function getClient(): Stripe {
  if (!_client) {
    _client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _client;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_: Stripe, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export const PLANS = {
  pro: {
    name: "Pro",
    get priceId() {
      return requireEnv("STRIPE_PRICE_PRO_MONTHLY_ID");
    },
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
