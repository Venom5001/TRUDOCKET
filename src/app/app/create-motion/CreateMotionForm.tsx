"use client";

import { useActionState } from "react";
import { createMotionAction, ActionState } from "./actions";
import Link from "next/link";

interface Props {
  canGenerate: boolean;
  generationsRemaining: number | null;
  isPro: boolean;
}

const initialState: ActionState = { status: "idle" };

export function CreateMotionForm({
  canGenerate,
  generationsRemaining,
  isPro,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    createMotionAction,
    initialState
  );

  if (state.status === "success") {
    return (
      <div className="space-y-6">
        <div className="bg-green-950 border border-green-700 rounded-xl p-4 flex items-start gap-3">
          <span className="text-green-400 mt-0.5">✓</span>
          <div>
            <p className="font-medium text-green-300">Draft generated</p>
            <p className="text-sm text-green-400/80">
              Saved as &ldquo;{state.document.title}&rdquo;
              {isPro && (
                <>
                  {" "}
                  &mdash;{" "}
                  <Link
                    href={`/app/documents/${state.document.id}`}
                    className="underline hover:text-green-300"
                  >
                    view in Documents
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
          ⚠ Drafting aid only — not legal advice. Review with a licensed
          attorney before filing.
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">{state.document.title}</h2>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
            {state.document.generatedContent}
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

  if (!canGenerate) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-2xl">🔒</p>
        <h2 className="text-xl font-semibold">Free limit reached</h2>
        <p className="text-gray-400">
          You&apos;ve used all {generationsRemaining === 0 ? "2" : ""} free
          generations. Upgrade to Pro for unlimited motion drafts.
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

  return (
    <form action={formAction} className="space-y-6">
      {!isPro && generationsRemaining !== null && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-lg p-3 text-sm text-indigo-300">
          Free plan: {generationsRemaining} of 2 generation
          {generationsRemaining === 1 ? "" : "s"} remaining.{" "}
          <Link href="/pricing" className="underline hover:text-indigo-200">
            Upgrade for unlimited.
          </Link>
        </div>
      )}

      {state.status === "error" && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
          {state.error}
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
            placeholder="Any additional context, prior rulings, or notes for the draft…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
        </div>
      </div>

      <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-300">
        ⚠ MotionForge generates drafting templates only — not legal advice.
        Always have a licensed attorney review before filing.
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
      >
        {isPending ? "Generating…" : "Generate Draft"}
      </button>
    </form>
  );
}
