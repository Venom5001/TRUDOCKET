"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserEntitlements } from "@/lib/entitlements";
import { generateMotionDraft, getClarifyingQuestions } from "@/lib/services/motion-generator";
import { parseMotionForm } from "@/lib/services/motion-validation";
import type { CaseLawSource } from "@/lib/services/motion-generator";

// ─── Action state types ───────────────────────────────────────────────────────

export type ActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      document: {
        id: string;
        title: string;
        generatedContent: string;
        sources: CaseLawSource[];
        citationsRemoved: number;
        citationsUnavailable: boolean;
        providerMeta: { provider: string; model: string } | null;
      };
    };

export type QuestionsState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "questions"; questions: string[] };

// ─── Clarifying questions action ──────────────────────────────────────────────

export async function getClarifyingQuestionsAction(
  _prevState: QuestionsState,
  formData: FormData
): Promise<QuestionsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", error: "Not authenticated." };
  }

  const parsed = parseMotionForm(formData);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { status: "error", error: firstError ?? "Validation failed." };
  }

  const questions = await getClarifyingQuestions(parsed.data);

  if (questions.length === 0) {
    return {
      status: "questions",
      questions: [
        "Are there any prior court rulings or orders in this matter that are relevant?",
        "What specific legal standard applies to this motion in your jurisdiction?",
        "Are there any procedural deadlines or timing constraints to note?",
        "What is the strongest opposing argument you anticipate from the other side?",
        "Are there any key exhibits or evidence that should be referenced?",
      ],
    };
  }

  return { status: "questions", questions };
}

// ─── Create motion action ─────────────────────────────────────────────────────

export async function createMotionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", error: "Not authenticated." };
  }
  const userId = session.user.id;

  const parsed = parseMotionForm(formData);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { status: "error", error: firstError ?? "Validation failed." };
  }

  const entitlements = await getUserEntitlements();
  if (!entitlements?.canGenerate) {
    return {
      status: "error",
      error: "You've used all 2 free generations. Upgrade to Pro for unlimited access.",
    };
  }

  const data = parsed.data;

  // Citations mode is Pro-only
  const wantsCitations = formData.get("includeCitations") === "on";
  const includeCitations = wantsCitations && entitlements.isPro;

  let generationResult;
  try {
    generationResult = await generateMotionDraft(data, {
      includeCitations,
      mode: includeCitations ? "citations" : "draft",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return { status: "error", error: msg };
  }

  const { title, content, sources, providerMeta, citationsRemoved, citationsUnavailable } =
    generationResult;

  // Find or create a Case (match by title + jurisdiction + caseType for this user)
  let caseRecord = await prisma.case.findFirst({
    where: {
      userId,
      title: data.caseTitle,
      jurisdiction: data.jurisdiction,
      caseType: data.caseType,
    },
  });
  if (!caseRecord) {
    caseRecord = await prisma.case.create({
      data: {
        userId,
        title: data.caseTitle,
        jurisdiction: data.jurisdiction,
        caseType: data.caseType,
        partyRole: data.partyRole,
      },
    });
  }

  const document = await prisma.document.create({
    data: {
      userId,
      caseId: caseRecord.id,
      title,
      documentType: "motion",
      jurisdiction: data.jurisdiction,
      caseType: data.caseType,
      motionType: data.motionType,
      partyRole: data.partyRole,
      facts: data.facts,
      reliefRequested: data.reliefRequested,
      additionalContext: data.additionalContext,
      generatedContent: content,
      sources: sources.length > 0 ? (sources as object[]) : undefined,
      providerMeta: providerMeta ?? undefined,
      status: "generated",
    },
  });

  await prisma.usageEvent.create({
    data: { userId, actionType: "motion_generate" },
  });

  return {
    status: "success",
    document: {
      id: document.id,
      title: document.title,
      generatedContent: content,
      sources,
      citationsRemoved,
      citationsUnavailable,
      providerMeta,
    },
  };
}
