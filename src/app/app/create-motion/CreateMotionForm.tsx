"use client";

import { useActionState } from "react";
import {
  createMotionAction,
  getClarifyingQuestionsAction,
  ActionState,
  QuestionsState,
} from "./actions";
import type { CaseLawSource } from "@/lib/services/motion-generator";
import { FREE_GENERATION_LIMIT } from "@/lib/entitlement-constants";
import Link from "next/link";

interface Props {
  canGenerate: boolean;
  generationsRemaining: number | null;
  isPro: boolean;
}

const initialMain: ActionState = { status: "idle" };
const initialQ: QuestionsState = { status: "idle" };

// ─── Sources panel ────────────────────────────────────────────────────────────

function SourcesPanel({
  sources,
  citationsRemoved,
  citationsUnavailable,
}: {
  sources: CaseLawSource[];
  citationsRemoved: number;
  citationsUnavailable: boolean;
}) {
  if (citationsUnavailable) {
    return (
      <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
        ⚠ Citations requested but <code>COURTLISTENER_API_TOKEN</code> is not
        configured. Draft generated without citations.
      </div>
    );
  }

  if (sources.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Retrieved Sources ({sources.length})
        </h3>
        {citationsRemoved > 0 && (
          <span className="text-xs bg-yellow-900/60 text-yellow-300 border border-yellow-700/50 rounded-full px-2 py-0.5">
            {citationsRemoved} hallucinated citation
            {citationsRemoved > 1 ? "s" : ""} removed
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Only these sources may be cited in the draft. The draft uses [S1], [S2]
        etc. to reference them.
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
                className="font-medium hover:text-indigo-300 transition-colors break-words"
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
        Sources retrieved from CourtListener. Always verify currency and
        applicability before filing.
      </p>
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────

export function CreateMotionForm({
  canGenerate,
  generationsRemaining,
  isPro,
}: Props) {
  const [mainState, mainFormAction, mainPending] = useActionState(
    createMotionAction,
    initialMain
  );
  const [qState, questionsFormAction, qPending] = useActionState(
    getClarifyingQuestionsAction,
    initialQ
  );

  // ── Success view ────────────────────────────────────────────────────────────
  if (mainState.status === "success") {
    const { document } = mainState;
    return (
      <div className="space-y-6">
        <div className="bg-green-950 border border-green-700 rounded-xl p-4 flex items-start gap-3">
          <span className="text-green-400 mt-0.5">✓</span>
          <div>
            <p className="font-medium text-green-300">Draft generated</p>
            <p className="text-sm text-green-400/80">
              Saved as &ldquo;{document.title}&rdquo;
              {isPro && (
                <>
                  {" "}&mdash;{" "}
                  <Link
                    href={`/app/documents/${document.id}`}
                    className="underline hover:text-green-300"
                  >
                    view in Documents
                  </Link>
                </>
              )}
              {document.providerMeta && (
                <span className="ml-2 text-green-500/60">
                  · {document.providerMeta.provider} / {document.providerMeta.model}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
          ⚠ Drafting aid only — not legal advice. Review with a licensed
          attorney before filing.
        </div>

        <SourcesPanel
          sources={document.sources}
          citationsRemoved={document.citationsRemoved}
          citationsUnavailable={document.citationsUnavailable}
        />

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">{document.title}</h2>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
            {document.generatedContent}
          </pre>
        </div>

        <div className="flex gap-3">
          <Link
            href="/app/create-motion"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors"
          >
            New Motion
          </Link>
          <Link
            href="/app"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold text-sm transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Locked view (free limit reached) ────────────────────────────────────────
  if (!canGenerate) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-2xl">🔒</p>
        <h2 className="text-xl font-semibold">Free limit reached</h2>
        <p className="text-gray-400">
          You&apos;ve used your free draft. Upgrade to Pro to keep drafting,
          save history, and unlock citations.
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

  const isPending = mainPending || qPending;

  return (
    <div className="space-y-6">
      {/* Generation limit banner */}
      {!isPro && generationsRemaining !== null && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-lg p-3 text-sm text-indigo-300">
          Free plan: {generationsRemaining} of {FREE_GENERATION_LIMIT} generation
          {generationsRemaining === 1 ? "" : "s"} remaining.{" "}
          <Link href="/pricing" className="underline hover:text-indigo-200">
            Upgrade for unlimited.
          </Link>
        </div>
      )}

      {/* Clarifying questions panel */}
      {qState.status === "questions" && qState.questions.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-700/50 rounded-xl p-5 space-y-3">
          <p className="font-medium text-indigo-300">
            Suggested clarifying questions
          </p>
          <p className="text-sm text-gray-400">
            Consider adding answers to the &ldquo;Additional Context&rdquo;
            field below before generating.
          </p>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
            {qState.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {qState.status === "error" && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
          {qState.error}
        </div>
      )}

      <form className="space-y-6">
        {/* Main error */}
        {mainState.status === "error" && (
          <div className="bg-red-950/40 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
            {mainState.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Case Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="caseTitle"
              required
              placeholder="e.g. Smith v. Jones"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Jurisdiction <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="jurisdiction"
              required
              placeholder="e.g. U.S. District Court, S.D.N.Y."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Case Type <span className="text-red-400">*</span>
            </label>
            <select
              name="caseType"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select case type…</option>
              <option value="Civil">Civil</option>
              <option value="Criminal">Criminal</option>
              <option value="Family">Family</option>
              <option value="Probate">Probate</option>
              <option value="Administrative">Administrative</option>
              <option value="Bankruptcy">Bankruptcy</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Motion Type <span className="text-red-400">*</span>
            </label>
            <select
              name="motionType"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select motion type…</option>
              <option value="Motion to Dismiss">Motion to Dismiss</option>
              <option value="Motion for Summary Judgment">
                Motion for Summary Judgment
              </option>
              <option value="Motion in Limine">Motion in Limine</option>
              <option value="Motion to Compel">Motion to Compel</option>
              <option value="Motion for Continuance">
                Motion for Continuance
              </option>
              <option value="Motion to Strike">Motion to Strike</option>
              <option value="Preliminary Injunction">
                Preliminary Injunction
              </option>
              <option value="Motion for Default Judgment">
                Motion for Default Judgment
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Party Role <span className="text-red-400">*</span>
            </label>
            <select
              name="partyRole"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select role…</option>
              <option value="Plaintiff">Plaintiff</option>
              <option value="Defendant">Defendant</option>
              <option value="Petitioner">Petitioner</option>
              <option value="Respondent">Respondent</option>
              <option value="Appellant">Appellant</option>
              <option value="Appellee">Appellee</option>
              <option value="Third-Party">Third-Party</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Statement of Facts <span className="text-red-400">*</span>
            </label>
            <textarea
              name="facts"
              required
              rows={6}
              placeholder="Describe the relevant facts of the case…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Relief Requested <span className="text-red-400">*</span>
            </label>
            <textarea
              name="reliefRequested"
              required
              rows={4}
              placeholder="Describe the specific relief you are requesting from the court…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Additional Context{" "}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              name="additionalContext"
              rows={3}
              placeholder="Any additional context, prior rulings, answers to clarifying questions, or notes for the draft…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>
        </div>

        {/* Citations toggle — Pro only */}
        {isPro ? (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="includeCitations"
              className="mt-0.5 accent-indigo-500"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              <span className="font-medium">Include case citations</span>
              <span className="block text-gray-500 mt-0.5">
                Retrieve relevant opinions from CourtListener and reference them
                in the draft. Only retrieved sources will be cited.
              </span>
            </span>
          </label>
        ) : (
          <div className="flex items-start gap-3 opacity-60">
            <input type="checkbox" disabled className="mt-0.5" />
            <span className="text-sm text-gray-400">
              <span className="font-medium">Include case citations</span>{" "}
              <Link
                href="/pricing"
                className="text-indigo-400 hover:underline font-normal"
              >
                Pro only
              </Link>
              <span className="block text-gray-600 mt-0.5">
                Retrieve relevant opinions from CourtListener and reference them
                in the draft.
              </span>
            </span>
          </div>
        )}

        <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
            ⚠ TruDocket generates drafting templates only — not legal advice.
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            formAction={mainFormAction}
            disabled={isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {mainPending ? "Generating…" : "Generate Draft"}
          </button>

          <button
            type="submit"
            formAction={questionsFormAction}
            disabled={isPending}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-sm"
          >
            {qPending ? "Thinking…" : "Ask Clarifying Questions"}
          </button>
        </div>
      </form>
    </div>
  );
}
