import { z } from "zod";

export const motionSchema = z.object({
  caseTitle: z.string().min(1, "Case title is required").max(200),
  jurisdiction: z.string().min(1, "Jurisdiction is required").max(100),
  caseType: z.string().min(1, "Case type is required").max(100),
  motionType: z.string().min(1, "Motion type is required").max(100),
  partyRole: z.string().min(1, "Party role is required").max(100),
  facts: z.string().min(10, "Facts must be at least 10 characters").max(10000),
  reliefRequested: z.string().min(5, "Relief requested is required").max(5000),
  additionalContext: z.string().max(5000).optional(),
});

export const onboardingMotionSchema = motionSchema.extend({
  caseTitle: z.string().max(200).optional(),
  caseType: z.string().max(100).optional(),
  clarifyingAnswers: z.record(z.string(), z.string()).optional(),
});

export type MotionInputs = z.infer<typeof motionSchema> & {
  clarifyingAnswers?: Record<string, string>;
};
export type OnboardingInputs = z.infer<typeof onboardingMotionSchema>;

export function parseMotionForm(formData: FormData) {
  return motionSchema.safeParse({
    caseTitle: formData.get("caseTitle") as string,
    jurisdiction: formData.get("jurisdiction") as string,
    caseType: formData.get("caseType") as string,
    motionType: formData.get("motionType") as string,
    partyRole: formData.get("partyRole") as string,
    facts: formData.get("facts") as string,
    reliefRequested: formData.get("reliefRequested") as string,
    additionalContext: (formData.get("additionalContext") as string) || undefined,
  });
}

function parseClarifyingAnswers(formData: FormData) {
  const raw = formData.get("clarifyingAnswers");
  if (typeof raw !== "string" || raw.trim() === "") return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const cleaned = Object.fromEntries(
        Object.entries(parsed)
          .map(([key, value]) => [key, String(value).trim()])
          .filter(([, value]) => value.length > 0)
      );

      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function parseOnboardingForm(formData: FormData) {
  return onboardingMotionSchema.safeParse({
    caseTitle: (formData.get("caseTitle") as string) || undefined,
    jurisdiction: formData.get("jurisdiction") as string,
    caseType: (formData.get("caseType") as string) || undefined,
    motionType: formData.get("motionType") as string,
    partyRole: formData.get("partyRole") as string,
    facts: formData.get("facts") as string,
    reliefRequested: formData.get("reliefRequested") as string,
    additionalContext: (formData.get("additionalContext") as string) || undefined,
    clarifyingAnswers: parseClarifyingAnswers(formData),
  });
}

export function normalizeOnboardingInputs(input: OnboardingInputs): MotionInputs {
  const cleanedAnswers = input.clarifyingAnswers
    ? Object.fromEntries(
        Object.entries(input.clarifyingAnswers)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0)
      ) as Record<string, string>
    : undefined;

  return {
    caseTitle:
      input.caseTitle?.trim() || `${input.motionType} matter`,
    jurisdiction: input.jurisdiction,
    caseType: input.caseType?.trim() || "General",
    motionType: input.motionType,
    partyRole: input.partyRole,
    facts: input.facts,
    reliefRequested: input.reliefRequested,
    additionalContext: input.additionalContext,
    clarifyingAnswers: cleanedAnswers,
  };
}
