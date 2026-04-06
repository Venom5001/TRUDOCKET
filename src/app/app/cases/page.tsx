import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/subscription";
import { isPro } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const subscription = await getUserSubscription();
  const hasPro = isPro(subscription?.status);

  if (!hasPro) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">⚖️</p>
        <h1 className="text-2xl font-bold">My Cases</h1>
        <p className="text-gray-400">
          Case management is available on the Pro plan. Upgrade to organise
          your motions by case.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  const cases = await prisma.case.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Cases</h1>
          <p className="text-gray-400 text-sm">
            {cases.length} case{cases.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/app/create-motion"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors"
        >
          + New Motion
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-400">
          No cases yet.{" "}
          <Link href="/app/create-motion" className="text-indigo-400 hover:underline">
            Generate a motion draft to create your first case.
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/app/cases/${c.id}`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {c.caseType} &middot; {c.jurisdiction} &middot;{" "}
                    {c.partyRole}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">
                    {c._count.documents} motion
                    {c._count.documents === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
