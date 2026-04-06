import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";
import { PricingCard } from "@/components/pricing-card";
import Link from "next/link";

export default async function PricingPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple Pricing</h1>
          <p className="text-gray-400 text-lg">
            Start free with 2 motion drafts. Upgrade for unlimited access.
          </p>
        </div>

        <div className="flex justify-center gap-8 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-80">
            <h2 className="text-xl font-semibold mb-2">Free</h2>
            <p className="text-4xl font-bold mb-1">$0</p>
            <p className="text-gray-400 mb-6">per month</p>
            <ul className="space-y-2 mb-8">
              <li className="text-gray-300">✓ 2 motion drafts total</li>
              <li className="text-gray-300">✓ Structured draft output</li>
              <li className="text-gray-300 text-gray-500">✗ Document history</li>
              <li className="text-gray-300 text-gray-500">✗ Case management</li>
            </ul>
            {session ? (
              <Link
                href="/app"
                className="block w-full text-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Go to App
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                className="block w-full text-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </Link>
            )}
          </div>

          <PricingCard plan={PLANS.pro} isLoggedIn={!!session} />
        </div>
      </div>
    </main>
  );
}
