import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserEntitlements, FREE_GENERATION_LIMIT } from "@/lib/entitlements";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const entitlements = await getUserEntitlements();

  const isPro = entitlements?.isPro ?? false;
  const usageCount = entitlements?.usageCount ?? 0;
  const canGenerate = entitlements?.canGenerate ?? false;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">
          Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-400">
          Draft motions, save documents, manage cases.
        </p>
      </div>

      {/* Plan + usage stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
            Plan
          </p>
          <p
            className={`text-2xl font-semibold ${isPro ? "text-indigo-400" : "text-gray-300"}`}
          >
            {isPro ? "Pro" : "Free"}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
            Generations Used
          </p>
          <p className="text-2xl font-semibold">
            {isPro ? (
              <span className="text-green-400">{usageCount}</span>
            ) : (
              <span className={usageCount >= FREE_GENERATION_LIMIT ? "text-red-400" : "text-white"}>
                {usageCount}{" "}
                <span className="text-base font-normal text-gray-400">
                  / {FREE_GENERATION_LIMIT} free
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
            Status
          </p>
          <p className={`text-2xl font-semibold ${canGenerate ? "text-green-400" : "text-red-400"}`}>
            {canGenerate ? "Active" : "Limit reached"}
          </p>
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {!isPro && (
        <div
          className={`rounded-xl p-5 mb-8 border ${
            canGenerate
              ? "bg-indigo-950/30 border-indigo-700/50"
              : "bg-red-950/30 border-red-700/50"
          }`}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium">
                {canGenerate
                  ? `${FREE_GENERATION_LIMIT - usageCount} free generation${FREE_GENERATION_LIMIT - usageCount === 1 ? "" : "s"} remaining`
                  : "Free generation limit reached"}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {canGenerate
                  ? "Upgrade to Pro for unlimited drafts, full document history, and case management."
                  : "Upgrade to Pro to continue drafting motions."}
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/app/create-motion"
          className={`block bg-gray-900 border rounded-xl p-6 transition-colors group ${
            canGenerate
              ? "border-gray-800 hover:border-indigo-600"
              : "border-gray-800 opacity-60 cursor-not-allowed pointer-events-none"
          }`}
        >
          <p className="text-2xl mb-3">✍️</p>
          <p className="font-semibold group-hover:text-indigo-300 transition-colors">
            Create Motion
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {canGenerate
              ? "Generate a new structured motion draft"
              : "Upgrade to generate more drafts"}
          </p>
        </Link>

        <Link
          href="/app/documents"
          className="block bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-6 transition-colors group"
        >
          <p className="text-2xl mb-3">📄</p>
          <p className="font-semibold group-hover:text-indigo-300 transition-colors">
            My Documents
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {isPro ? "Browse your saved motion drafts" : "Pro — upgrade to access"}
          </p>
        </Link>

        <Link
          href="/app/cases"
          className="block bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-6 transition-colors group"
        >
          <p className="text-2xl mb-3">⚖️</p>
          <p className="font-semibold group-hover:text-indigo-300 transition-colors">
            My Cases
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {isPro ? "Manage and organise your cases" : "Pro — upgrade to access"}
          </p>
        </Link>
      </div>
    </div>
  );
}
