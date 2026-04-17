import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { CaseLawSource } from "@/lib/services/motion-generator";
import Link from "next/link";

export const dynamic = "force-dynamic";

function isCaseLawSourceArray(value: unknown): value is CaseLawSource[] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).id === "string"
    )
  );
}

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

  const sources = isCaseLawSourceArray(document.sources)
    ? document.sources
    : [];

  const providerMeta =
    document.providerMeta &&
    typeof document.providerMeta === "object" &&
    !Array.isArray(document.providerMeta) &&
    "provider" in document.providerMeta
      ? (document.providerMeta as { provider: string; model: string })
      : null;

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mb-6">
        <span>{document.motionType}</span>
        <span>·</span>
        <span>{document.jurisdiction}</span>
        <span>·</span>
        <span>{document.partyRole}</span>
        <span>·</span>
        <span>{document.createdAt.toLocaleDateString()}</span>
        {providerMeta && (
          <>
            <span>·</span>
            <span className="text-gray-500">
              {providerMeta.provider} / {providerMeta.model}
            </span>
          </>
        )}
      </div>

      <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300 mb-6">
        ⚠ Drafting aid only — not legal advice. Review with a licensed
        attorney before filing.
      </div>

      {/* Sources panel */}
      {sources.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold">
            Case Law Sources ({sources.length})
          </h2>
          <p className="text-xs text-gray-500">
            These sources were retrieved from CourtListener and passed to the
            AI. Only these sources may be cited in the draft ([S1], [S2] etc.).
          </p>
          <ol className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-indigo-400 font-mono font-medium shrink-0">
                    [{s.id}]
                  </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-indigo-300 transition-colors"
                  >
                    {s.title}
                  </a>
                </div>
                <p className="text-gray-400 ml-8 mt-0.5">
                  {s.court}
                  {s.date ? ` · ${s.date}` : ""}
                </p>
                {s.snippet && (
                  <p className="text-gray-500 ml-8 mt-1 line-clamp-2 italic text-xs">
                    &ldquo;{s.snippet}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 border-t border-gray-800 pt-3">
            Always verify that cited sources are current, on point, and not
            overruled before filing.
          </p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
          {document.generatedContent}
        </pre>
      </div>
    </div>
  );
}
