"use client";

import { useState } from "react";

interface Plan {
  name: string;
  price: string;
  priceId: string;
  interval: string;
  features: readonly string[];
}

interface PricingCardProps {
  plan: Plan;
  isLoggedIn: boolean;
}

export function PricingCard({ plan, isLoggedIn }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (!isLoggedIn) {
      window.location.href = "/api/auth/signin";
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { priceId } = plan;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId })
      });

      const contentType = res.headers.get("content-type") ?? "";

      // If the API ever returns a redirect, follow it in the browser
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      // Prefer JSON when it's actually JSON
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? `Checkout failed (${res.status})`);
        if (!data.url) throw new Error("Checkout URL missing from response.");
        window.location.href = data.url;
        return;
      }

      // Otherwise read text so we don't crash on res.json()
      const text = await res.text();
      throw new Error(text || `Checkout failed (${res.status})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="bg-indigo-950 border border-indigo-700 rounded-xl p-8 w-80 relative">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
        Popular
      </div>
      <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
      <p className="text-4xl font-bold mb-1">{plan.price}</p>
      <p className="text-gray-400 mb-6">per {plan.interval}</p>
      <ul className="space-y-2 mb-8">
        {plan.features.map((feature) => (
          <li key={feature} className="text-gray-300">
            ✓ {feature}
          </li>
        ))}
      </ul>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
      >
        {loading ? "Loading..." : "Subscribe"}
      </button>
    </div>
  );
}
