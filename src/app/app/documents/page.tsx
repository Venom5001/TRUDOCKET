import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/subscription";
import { isPro } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const subscription = await getUserSubscription();
  const hasPro = isPro(subscription?.status);

  if (!hasPro) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-4xl">📄</p>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-gray-400">
          Every draft you generate is saved — but browsing and revisiting your
          full history is a Pro feature. Upgrade once and your entire archive
          is waiting for you.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
        >
          Unlock document history
        </Link>
        <p className="text-xs text-gray-600">
          Or{" "}
          <Link
            href="/app/create-motion"
            className="underline hover:text-gray-400"
          >
            generate a new draft
          </Link>{" "}
          on the free plan.
        </p>
      </div>
    );
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { case: { select: { title: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Documents</h1>
          <p className="text-gray-400 text-sm">
            {documents.length} saved draft{documents.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/app/create-motion"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors"
        >
          + New Motion
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-400">
          No documents yet.{" "}
          <Link href="/app/create-motion" className="text-indigo-400 hover:underline">
            Generate your first motion draft.
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/app/documents/${doc.id}`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {doc.motionType} &middot; {doc.jurisdiction}
                    {doc.case && (
                      <span className="text-gray-500">
                        {" "}
                        &middot; {doc.case.title}
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap pt-0.5">
                  {doc.createdAt.toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
