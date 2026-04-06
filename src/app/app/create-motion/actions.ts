"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserEntitlements } from "@/lib/entitlements";
import { generateMotionDraft } from "@/lib/services/motion-generator";

const motionSchema = z.object({
  caseTitle: z.string().min(1, "Case title is required").max(200),
  jurisdiction: z.string().min(1, "Jurisdiction is required").max(100),
  caseType: z.string().min(1, "Case type is required").max(100),
  motionType: z.string().min(1, "Motion type is required").max(100),
  partyRole: z.string().min(1, "Party role is required").max(100),
  facts: z
    .string()
    .min(10, "Facts must be at least 10 characters")
    .max(10000),
  reliefRequested: z
    .string()
    .min(5, "Relief requested is required")
    .max(5000),
  additionalContext: z.string().max(5000).optional(),
});

export type ActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      document: { id: string; title: string; generatedContent: string };
    };

export async function createMotionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", error: "Not authenticated." };
  }
  const userId = session.user.id;

  const raw = {
    caseTitle: formData.get("caseTitle") as string,
    jurisdiction: formData.get("jurisdiction") as string,
    caseType: formData.get("caseType") as string,
    motionType: formData.get("motionType") as string,
    partyRole: formData.get("partyRole") as string,
    facts: formData.get("facts") as string,
    reliefRequested: formData.get("reliefRequested") as string,
    additionalContext: (formData.get("additionalContext") as string) || undefined,
  };

  const parsed = motionSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    ).flat()[0];
    return { status: "error", error: firstError ?? "Validation failed." };
  }

  const entitlements = await getUserEntitlements();
  if (!entitlements?.canGenerate) {
    return {
      status: "error",
      error:
        "You've used all 2 free generations. Upgrade to Pro for unlimited access.",
    };
  }

  const data = parsed.data;

  const { title, content } = await generateMotionDraft(data);

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
    },
  };
}
