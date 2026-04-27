"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useActionState } from "react";
import {
  getClarifyingQuestionsAction,
  generateOnboardingDraftAction,
  skipOnboardingAction,
  finishOnboardingAction,
  ActionState,
  QuestionsState,
} from "./actions";
import type { OnboardingInputs } from "@/lib/services/motion-validation";
import Link from "next/link";

const initialMain: ActionState = { status: "idle" };
const initialQ: QuestionsState = { status: "idle" };

function hiddenInputs(data: OnboardingInputs, answers?: Record<string, string>) {
  return (
    <>
      <input type="hidden" name="caseTitle" value={data.caseTitle ?? ""} />
      <input type="hidden" name="jurisdiction" value={data.jurisdiction} />
      <input type="hidden" name="caseType" value={data.caseType ?? ""} />
      <input type="hidden" name="motionType" value={data.motionType} />
      <input type="hidden" name="partyRole" value={data.partyRole} />
      <input type="hidden" name="facts" value={data.facts} />
      <input type="hidden" name="reliefRequested" value={data.reliefRequested} />
      <input type="hidden" name="additionalContext" value={data.additionalContext ?? ""} />
      <input
        type="hidden"
        name="clarifyingAnswers"
        value={JSON.stringify(answers ?? {})}
      />
    </>
  );
}

interface Props {
  canGenerate: boolean;
  generationsRemaining: number | null;
  isPro: boolean;
}

export function OnboardingWizard({ canGenerate, generationsRemaining, isPro }: Props) {
  const [step, setStep] = useState(1);
  const [inputData, setInputData] = useState<OnboardingInputs | null>(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});
  const [draftState, draftFormAction, draftPending] = useActionState(
    generateOnboardingDraftAction,
    initialMain
  );
  const [qState, questionsFormAction, qPending] = useActionState(
    getClarifyingQuestionsAction,
    initialQ
  );

  const isBusy = draftPending || qPending;

  useEffect(() => {
    const incomingQuestions =
      qState.status === "questions" ? qState.questions : [];

    if (incomingQuestions.length > 0) {
      setQuestions((current) => {
        const currentQuestions = current.map((item) => item.question);
        const shouldReplace =
          currentQuestions.length !== incomingQuestions.length ||
          currentQuestions.some((text, index) => text !== incomingQuestions[index]);

        return shouldReplace
          ? incomingQuestions.map((question, index) => ({
              id: `q${index + 1}`,
              question,
            }))
          : current;
      });
      setClarifyingAnswers((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([, answer]) => answer.trim().length > 0)
        ) as Record<string, string>
      );
    }
  }, [qState]);

  function handleStep1Submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    setInputData({
      caseTitle: (formData.get("caseTitle") as string) || undefined,
      jurisdiction: (formData.get("jurisdiction") as string).trim(),
      caseType: (formData.get("caseType") as string) || undefined,
      motionType: (formData.get("motionType") as string).trim(),
      partyRole: (formData.get("partyRole") as string).trim(),
      facts: (formData.get("facts") as string).trim(),
      reliefRequested: (formData.get("reliefRequested") as string).trim(),
      additionalContext: (formData.get("additionalContext") as string) || undefined,
    });
    setStep(2);
  }

  function handleAnswerChange(id: string, value: string) {
    setClarifyingAnswers((current) => ({
      ...current,
      [id]: value,
    }));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Wizard</h1>
          <p className="text-gray-400 mt-1 max-w-2xl">
            We&apos;ll walk you through a short intake, generate clarifying
            questions if needed, and produce a structured motion draft preview.
            Drafting assistance only — not legal advice.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <form action={skipOnboardingAction} className="inline">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition"
            >
              Skip onboarding
            </button>
          </form>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-sm font-semibold transition"
          >
            Start over
          </button>
        </div>
      </div>

      {!isPro && generationsRemaining !== null && (
        <div className="bg-indigo-950/30 border border-indigo-700/50 rounded-xl p-4 text-sm text-indigo-200">
          Free plan: {generationsRemaining} of 2 generation
          {generationsRemaining === 1 ? "" : "s"} remaining. 
          <Link href="/pricing" className="underline hover:text-indigo-100">
            Upgrade for unlimited access.
          </Link>
        </div>
      )}

      <div className="rounded-3xl border border-gray-800 bg-gray-950/60 p-8 space-y-8">
        <div className="grid grid-cols-3 gap-3 text-sm text-gray-400">
          {[
            { label: "Intake", index: 1 },
            { label: "Questions", index: 2 },
            { label: "Draft", index: 3 },
          ].map((item) => (
            <button
              key={item.index}
              type="button"
              onClick={() => setStep(item.index)}
              className={`rounded-2xl border p-3 text-left transition ${
                step === item.index
                  ? "border-indigo-500 bg-indigo-950 text-white"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              <span className="block font-semibold text-sm">Step {item.index}</span>
              <span className="block text-gray-400">{item.label}</span>
            </button>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-xl px-4 py-3 text-sm text-indigo-300">
              Messy is fine — bullet points, fragments, and rough notes all
              work. We&apos;ll structure everything into a proper draft.
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Jurisdiction <span className="text-red-400">*</span>
                </label>
                <input
                  name="jurisdiction"
                  type="text"
                  required
                  placeholder="e.g. U.S. District Court, S.D.N.Y."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Motion Type <span className="text-red-400">*</span>
                </label>
                <input
                  name="motionType"
                  type="text"
                  required
                  placeholder="e.g. Motion to Dismiss"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Party Role <span className="text-red-400">*</span>
                </label>
                <input
                  name="partyRole"
                  type="text"
                  required
                  placeholder="e.g. Plaintiff"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Facts <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="facts"
                  required
                  rows={6}
                  placeholder="Describe the relevant facts of the case…"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Dates, names, what happened — in any order. No need for
                  complete sentences.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Relief Requested <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="reliefRequested"
                  required
                  rows={4}
                  placeholder="Describe the specific relief you are requesting…"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  What do you want the court to do? Dismiss the case, compel
                  discovery, issue an injunction — even a rough description
                  works.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Case Title <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  name="caseTitle"
                  type="text"
                  placeholder="e.g. Smith v. Jones"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Case Type <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  name="caseType"
                  type="text"
                  placeholder="e.g. Civil"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Additional Context <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  name="additionalContext"
                  rows={4}
                  placeholder="Any extra details, prior rulings, or notes for the draft…"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
              >
                Continue to questions
              </button>
            </div>
          </form>
        )}

        {step === 2 && inputData && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Step 2: Clarifying questions</h2>
                <p className="text-gray-400 text-sm">
                  We&apos;ll suggest questions that make the motion draft stronger.
                  You can answer any question or skip them individually.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl text-sm transition"
                >
                  Skip remaining
                </button>
              </div>
            </div>

            <form className="space-y-4">
              {hiddenInputs(inputData, clarifyingAnswers)}
              {qState.status === "error" && (
                <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-300">
                  {qState.error}
                </div>
              )}

              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-3xl border border-gray-800 bg-gray-900 p-5"
                    >
                      <p className="text-sm text-gray-400 uppercase tracking-wide">
                        Question {index + 1}
                      </p>
                      <p className="mt-2 text-gray-100">{question.question}</p>
                      <label className="mt-4 block text-sm font-medium text-gray-300 mb-2">
                        Answer (optional)
                      </label>
                      <textarea
                        name={`answer-${question.id}`}
                        value={clarifyingAnswers[question.id] ?? ""}
                        onChange={(event) =>
                          handleAnswerChange(question.id, event.target.value)
                        }
                        rows={4}
                        placeholder="Add any details that help clarify this point…"
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">Suggested questions</p>
                  <p>
                    Click below to generate clarifying questions based on your intake. Answers are optional and can be skipped individually.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  formAction={questionsFormAction}
                  disabled={isBusy}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {qPending ? "Thinking…" : "Generate clarifying questions"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition"
                >
                  Continue to draft
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && inputData && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Step 3: Draft preview</h2>
                <p className="text-gray-400 text-sm">
                  Generate a structured motion draft from the intake you provided.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition"
                >
                  Back to questions
                </button>
                <form action={skipOnboardingAction} className="inline">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition"
                  >
                    Skip onboarding
                  </button>
                </form>
              </div>
            </div>

            {draftState.status === "error" && (
              <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-300">
                {draftState.error}
              </div>
            )}

            <form className="space-y-4">
              {hiddenInputs(inputData, clarifyingAnswers)}
              <button
                type="submit"
                formAction={draftFormAction}
                disabled={isBusy}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {draftPending ? "Generating draft…" : "Generate draft preview"}
              </button>
            </form>

            {draftState.status === "success" && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
                  <h3 className="text-lg font-semibold text-white">Trust panel</h3>
                  <div className="grid gap-4 md:grid-cols-3 mt-4">
                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wide">What you told us</p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-200">
                        <li>
                          <span className="font-semibold">Jurisdiction:</span> {inputData.jurisdiction}
                        </li>
                        <li>
                          <span className="font-semibold">Motion:</span> {inputData.motionType}
                        </li>
                        <li>
                          <span className="font-semibold">Role:</span> {inputData.partyRole}
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wide">What to verify</p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-200">
                        <li>Review factual accuracy.</li>
                        <li>Confirm jurisdiction-specific requirements.</li>
                        <li>Validate relief requested and procedural posture.</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wide">Assumptions</p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-200">
                        <li>Draft is based only on the information you provided.</li>
                        <li>No citations were verified or inserted in this preview.</li>
                        <li>Review with a licensed attorney before filing.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-700 bg-amber-950/30 p-5 text-sm text-amber-200">
                  ⚠ Drafting assistance only. Not legal advice.
                </div>

                <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 space-y-4">
                  <h3 className="text-lg font-semibold">Generated motion preview</h3>
                  <pre className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-gray-200">
                    {draftState.document.generatedContent}
                  </pre>
                </div>

                {/* Next-actions bar */}
                <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-5 space-y-3">
                  <p className="text-sm font-semibold text-gray-200">What&apos;s next?</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/app/create-motion"
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Polish tone →
                    </Link>
                    <Link
                      href="/app/create-motion"
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Add missing sections →
                    </Link>
                    {!isPro && (
                      <Link
                        href="/pricing"
                        className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-colors"
                      >
                        Upgrade for citations + full history →
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Use the full Create Motion form to refine the draft, add
                    case law citations (Pro), and save it to your document
                    history.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <form action={finishOnboardingAction} className="inline">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition"
                    >
                      Finish — go to dashboard
                    </button>
                  </form>
                  <form action={skipOnboardingAction} className="inline">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition"
                    >
                      Skip setup
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
