import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/subscription";
import { isPro } from "@/lib/stripe";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const subscription = await getUserSubscription();
  const hasPro = isPro(subscription?.status);

  if (!hasPro) {
    redirect("/pricing");
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/app/billing"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Billing
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-1">Plan</h3>
            <p className="text-2xl font-semibold text-indigo-400">Pro</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-1">Status</h3>
            <p className="text-2xl font-semibold text-green-400 capitalize">
              {subscription?.status}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-1">Renews</h3>
            <p className="text-2xl font-semibold">
              {subscription?.stripeCurrentPeriodEnd.toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-4">
            Welcome, {session.user.name}!
          </h2>
          <p className="text-gray-400">
            You have full access to all Pro features. Build something amazing.
          </p>
        </div>
      </div>
    </main>
  );
}
