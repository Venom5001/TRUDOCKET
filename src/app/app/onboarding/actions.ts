"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getUserEntitlements } from "@/lib/entitlements";
import { generateMotionDraft, getClarifyingQuestions } from "@/lib/services/motion-generator";
import {
  normalizeOnboardingInputs,
  parseOnboardingForm,
} from "@/lib/services/motion-validation";
import type { CaseLawSource } from "@/lib/services/motion-generator";

export type QuestionsState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "questions"; questions: string[] };

export type ActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      document: {
        title: string;
        generatedContent: string;
        sources: CaseLawSource[];
        citationsRemoved: number;
        citationsUnavailable: boolean;
        providerMeta: { provider: string; model: string } | null;
      };
    };

const FALLBACK_QUESTIONS = [
  "Are there any prior court rulings or orders in this matter that are relevant?",
  "What specific legal standard applies to this motion in your jurisdiction?",
  "Are there any procedural deadlines or timing constraints to note?",
  "What is the strongest opposing argument you anticipate from the other side?",
  "Are there any key exhibits or evidence that should be referenced?",
];

export async function getClarifyingQuestionsAction(
  _prevState: QuestionsState,
  formData: FormData
): Promise<QuestionsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", error: "Not authenticated." };
  }

  const parsed = parseOnboardingForm(formData);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { status: "error", error: firstError ?? "Validation failed." };
  }

  const inputs = normalizeOnboardingInputs(parsed.data);
  const questions = await getClarifyingQuestions(inputs);
  if (questions.length === 0) {
    return { status: "questions", questions: FALLBACK_QUESTIONS };
  }

  return { status: "questions", questions };
}

export async function generateOnboardingDraftAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", error: "Not authenticated." };
  }
  const userId = session.user.id;

  const parsed = parseOnboardingForm(formData);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { status: "error", error: firstError ?? "Validation failed." };
  }

  const entitlements = await getUserEntitlements();
  if (!entitlements?.canGenerate) {
    return {
      status: "error",
      error:
        "You've used both free drafts. Upgrade to Pro to keep generating unlimited motion drafts.",
    };
  }

  const inputs = normalizeOnboardingInputs(parsed.data);

  let generationResult;
  try {
    generationResult = await generateMotionDraft(inputs, { mode: "draft" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Draft generation failed";
    const isProviderError =
      message.includes("API") ||
      message.includes("provider") ||
      message.includes("LLM");
    return {
      status: "error",
      error: isProviderError
        ? "The drafting service is temporarily unavailable. Please try again in a moment."
        : message,
    };
  }

  const caseRecord =
    (await prisma.case.findFirst({
      where: {
        userId,
        title: inputs.caseTitle,
        jurisdiction: inputs.jurisdiction,
        caseType: inputs.caseType,
      },
    })) ??
    (await prisma.case.create({
      data: {
        userId,
        title: inputs.caseTitle,
        jurisdiction: inputs.jurisdiction,
        caseType: inputs.caseType,
        partyRole: inputs.partyRole,
      },
    }));

  const document = await prisma.document.create({
    data: {
      userId,
      caseId: caseRecord.id,
      title: generationResult.title,
      documentType: "motion",
      jurisdiction: inputs.jurisdiction,
      caseType: inputs.caseType,
      motionType: inputs.motionType,
      partyRole: inputs.partyRole,
      facts: inputs.facts,
      reliefRequested: inputs.reliefRequested,
      additionalContext: inputs.additionalContext,
      clarifyingAnswers:
        inputs.clarifyingAnswers && Object.keys(inputs.clarifyingAnswers).length > 0
          ? inputs.clarifyingAnswers
          : undefined,
      generatedContent: generationResult.content,
      sources:
        generationResult.sources.length > 0
          ? JSON.parse(JSON.stringify(generationResult.sources))
          : undefined,
      providerMeta: generationResult.providerMeta ?? undefined,
      status: "generated",
    },
  });

  await prisma.usageEvent.create({
    data: { userId, actionType: "motion_generate" },
  });

  return {
    status: "success",
    document: {
      title: generationResult.title,
      generatedContent: generationResult.content,
      sources: generationResult.sources,
      citationsRemoved: generationResult.citationsRemoved,
      citationsUnavailable: generationResult.citationsUnavailable,
      providerMeta: generationResult.providerMeta,
    },
  };
}

async function completeOnboarding() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  });

  redirect("/app/create-motion");
}

export async function skipOnboardingAction() {
  await completeOnboarding();
}

export async function finishOnboardingAction() {
  await completeOnboarding();
}
