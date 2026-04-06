import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id }, // ownership enforced
    include: { case: { select: { id: true, title: true } } },
  });

  if (!document) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6 text-sm text-gray-400">
        <Link href="/app/documents" className="hover:text-white transition-colors">
          ← Documents
        </Link>
        {document.case && (
          <>
            <span>/</span>
            <Link
              href={`/app/cases/${document.case.id}`}
              className="hover:text-white transition-colors"
            >
              {document.case.title}
            </Link>
          </>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-1">{document.title}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {document.motionType} &middot; {document.jurisdiction} &middot;{" "}
        {document.partyRole} &middot; Created{" "}
        {document.createdAt.toLocaleDateString()}
      </p>

      <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300 mb-6">
        ⚠ Drafting aid only — not legal advice. Review with a licensed
        attorney before filing.
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
          {document.generatedContent}
        </pre>
      </div>
    </div>
  );
}
