import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { id } = await params;

  const caseRecord = await prisma.case.findFirst({
    where: { id, userId: session.user.id }, // ownership enforced
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          motionType: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });

  if (!caseRecord) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 text-sm text-gray-400">
        <Link href="/app/cases" className="hover:text-white transition-colors">
          ← Cases
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">{caseRecord.title}</h1>
        <p className="text-gray-400 text-sm">
          {caseRecord.caseType} &middot; {caseRecord.jurisdiction} &middot;{" "}
          {caseRecord.partyRole} &middot; Created{" "}
          {caseRecord.createdAt.toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Motions ({caseRecord.documents.length})
        </h2>
        <Link
          href="/app/create-motion"
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors"
        >
          + New Motion
        </Link>
      </div>

      {caseRecord.documents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
          No motions yet for this case.
        </div>
      ) : (
        <div className="space-y-3">
          {caseRecord.documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/app/documents/${doc.id}`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {doc.motionType}
                  </p>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap">
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
