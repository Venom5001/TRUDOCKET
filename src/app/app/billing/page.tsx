export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/subscription";
import { isPro } from "@/lib/stripe";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { BillingSuccessPoller } from "@/components/billing-success-poller";
import Link from "next/link";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const [subscription, params] = await Promise.all([
    getUserSubscription(),
    searchParams,
  ]);

  const hasPro = isPro(subscription?.status);
  const showSuccess = params.success === "1";

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/app"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold">Billing</h1>
        </div>

        <BillingSuccessPoller isPro={hasPro} success={showSuccess} />

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {hasPro && subscription ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="text-lg font-medium capitalize text-green-400">
                      {subscription.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Next billing date</p>
                    <p className="text-lg font-medium">
                      {subscription.stripeCurrentPeriodEnd.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <BillingPortalButton />
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-400">You are on the free plan.</p>
              <Link
                href="/pricing"
                className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
