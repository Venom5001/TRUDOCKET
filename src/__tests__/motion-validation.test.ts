import { describe, it, expect } from "vitest";
import { normalizeOnboardingInputs, parseOnboardingForm } from "@/lib/services/motion-validation";

describe("onboarding motion validation", () => {
  it("parses clarifying answers JSON and strips blank answers", () => {
    const formData = new FormData();
    formData.set("jurisdiction", "U.S. District Court");
    formData.set("motionType", "Motion to Dismiss");
    formData.set("partyRole", "Plaintiff");
    formData.set("facts", "The facts are described here.");
    formData.set("reliefRequested", "Dismiss the claim.");
    formData.set(
      "clarifyingAnswers",
      JSON.stringify({ q1: "Answer one", q2: "   ", q3: "Answer three" })
    );

    const result = parseOnboardingForm(formData);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected parseOnboardingForm to succeed");

    expect(result.data.clarifyingAnswers).toEqual({
      q1: "Answer one",
      q3: "Answer three",
    });
  });

  it("normalizes onboarding inputs and removes empty clarifying answers", () => {
    const normalized = normalizeOnboardingInputs({
      motionType: "Motion to Dismiss",
      jurisdiction: "U.S. District Court",
      partyRole: "Plaintiff",
      facts: "The facts are described here.",
      reliefRequested: "Dismiss the claim.",
      clarifyingAnswers: {
        q1: "",
        q2: "This is a valid answer.",
      },
    });

    expect(normalized.clarifyingAnswers).toEqual({
      q2: "This is a valid answer.",
    });
  });
});
