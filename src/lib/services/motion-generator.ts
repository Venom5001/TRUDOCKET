import { getRouter } from "./llm";
import type { GenerationMode } from "./llm";
import type { CaseLawSource } from "./caselaw/courtlistener";
import { searchOpinions } from "./caselaw/courtlistener";
import type { MotionInputs } from "./motion-validation";

export type { CaseLawSource };
export type { MotionInputs } from "./motion-validation";

export interface GenerationOptions {
  /** Pro-only; requires COURTLISTENER_API_TOKEN to retrieve sources. */
  includeCitations?: boolean;
  /**
   * Controls which provider the router prefers:
   *   "draft"     → Anthropic   (default for motion generation)
   *   "citations" → Anthropic   (structured output with source tags)
   *   "review"    → OpenAI      (analytical review tasks)
   */
  mode?: GenerationMode;
}

export interface GeneratedMotion {
  title: string;
  content: string;
  sources: CaseLawSource[];
  providerMeta: { provider: string; model: string } | null;
  citationsRemoved: number;
  citationsUnavailable: boolean;
}

// ─── Citation guard ───────────────────────────────────────────────────────────

/**
 * Strips any [Sn] markers from `content` that don't correspond to a real
 * source in `sources`.  Exported so it can be unit-tested independently.
 */
export function guardCitations(
  content: string,
  sources: CaseLawSource[]
): { content: string; removed: string[] } {
  const validIds = new Set(sources.map((s) => s.id));
  const removed: string[] = [];

  const cleaned = content.replace(/\[S(\d+)\]/g, (match) => {
    if (validIds.has(match.slice(1, -1))) return match;
    removed.push(match);
    return "";
  });

  return { content: cleaned.replace(/\s{3,}/g, "\n\n").trim(), removed };
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildSystemPrompt(sources: CaseLawSource[]): string {
  const sourceBlock =
    sources.length > 0
      ? `\n\nREFERENCE SOURCES (use ONLY these for citations):\n${sources
          .map(
            (s) =>
              `[${s.id}] ${s.title} — ${s.court} (${s.date})\n  Snippet: ${s.snippet}\n  URL: ${s.url}`
          )
          .join("\n\n")}`
      : "";

  return `You are a legal drafting assistant for MotionForge. You generate structured motion drafts to assist licensed attorneys.

MANDATORY RULES:
1. This is a DRAFTING TEMPLATE only — NOT legal advice.
2. Do NOT invent, hallucinate, or generate any case citations, statutes, or legal authorities that are not explicitly provided.
3. ${
    sources.length > 0
      ? `You MAY cite sources using ONLY the tags [S1]…[S${sources.length}] provided below. Do not invent other citation formats.`
      : "Do NOT include any case citations. Use the placeholder [Counsel to insert citation] wherever a citation would normally appear."
  }
4. Always attribute statements of law to the provided sources or to placeholders.
5. Structure your output exactly as: Introduction → Background/Facts → Argument (lettered sub-sections) → Conclusion/Relief → Signature block → Certificate of Service → Disclaimer.
6. End with the full disclaimer footer as instructed.${sourceBlock}`;
}

function buildDraftPrompt(
  inputs: MotionInputs,
  sources: CaseLawSource[]
): string {
  const contextPart = inputs.additionalContext
    ? `\nADDITIONAL CONTEXT:\n${inputs.additionalContext}`
    : "";

  const answers = inputs.clarifyingAnswers
    ? Object.values(inputs.clarifyingAnswers)
        .map((answer) => answer.trim())
        .filter((answer) => answer.length > 0)
    : [];

  const clarifyingPart = answers.length
    ? `\nCLARIFYING ANSWERS:\n${answers.map((answer) => `- ${answer}`).join("\n")}`
    : "";

  const citationInstruction =
    sources.length > 0
      ? "Where appropriate, cite the provided sources using [S1], [S2] etc. notation. ONLY use those exact tags — never invent others."
      : "Do not include any case citations. Use [Counsel to insert citation] as a placeholder wherever a citation is needed.";

  return `Draft a ${inputs.motionType} for the following matter:

CASE: ${inputs.caseTitle}
JURISDICTION: ${inputs.jurisdiction}
CASE TYPE: ${inputs.caseType}
FILING PARTY: ${inputs.partyRole}

STATEMENT OF FACTS:
${inputs.facts}

RELIEF REQUESTED:
${inputs.reliefRequested}${contextPart}${clarifyingPart}

${citationInstruction}

Generate a complete, professionally structured motion draft. End with a disclaimer that this is a drafting aid only, not legal advice, and must be reviewed by a licensed attorney before filing.`;
}

function buildQuestionsPrompt(inputs: MotionInputs): string {
  return `Motion: ${inputs.motionType}
Jurisdiction: ${inputs.jurisdiction}
Case type: ${inputs.caseType}
Party role: ${inputs.partyRole}
Facts: ${inputs.facts}
Relief sought: ${inputs.reliefRequested}${
    inputs.additionalContext
      ? `\nAdditional context: ${inputs.additionalContext}`
      : ""
  }

What are the most important clarifying questions that would help draft a stronger, more complete ${inputs.motionType}? Focus on missing facts, jurisdictional specifics, and key arguments not yet addressed. Return a JSON array of strings only — no markdown, no explanation, maximum 5 questions.`;
}

// ─── Clarifying questions ─────────────────────────────────────────────────────

export async function getClarifyingQuestions(
  inputs: MotionInputs
): Promise<string[]> {
  const router = getRouter();
  if (!router) return [];

  try {
    const response = await router.chat(
      [{ role: "user", content: buildQuestionsPrompt(inputs) }],
      {
        systemPrompt:
          "You are a legal drafting assistant. Return ONLY a valid JSON array of strings. No markdown, no explanation.",
        maxTokens: 512,
        timeoutMs: 20_000,
      },
      "review" // analytical task → prefer OpenAI
    );

    const raw = response.content.trim();
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed: unknown = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) {
      return (parsed as string[]).slice(0, 5);
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Main draft generator ─────────────────────────────────────────────────────

export async function generateMotionDraft(
  inputs: MotionInputs,
  options: GenerationOptions = {}
): Promise<GeneratedMotion> {
  const router = getRouter();

  // No LLM configured → deterministic mock
  if (!router) {
    return generateMockDraft(inputs);
  }

  // Determine routing mode for this generation
  const routingMode: GenerationMode = options.includeCitations
    ? "citations"
    : (options.mode ?? "draft");

  // Retrieve sources when citations are requested (Pro-only path)
  let sources: CaseLawSource[] = [];
  let citationsUnavailable = false;

  if (options.includeCitations) {
    const searchQuery = `${inputs.motionType} ${inputs.caseType} ${inputs.jurisdiction}`;
    const result = await searchOpinions({ query: searchQuery, limit: 5 });
    sources = result.sources;
    citationsUnavailable = result.tokenMissing;
  }

  // Generate draft
  let rawContent: string;
  let providerMeta: { provider: string; model: string };

  try {
    const response = await router.chat(
      [{ role: "user", content: buildDraftPrompt(inputs, sources) }],
      {
        systemPrompt: buildSystemPrompt(sources),
        maxTokens: 4096,
        timeoutMs: 90_000,
      },
      routingMode
    );
    rawContent = response.content;
    providerMeta = { provider: response.provider, model: response.model };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "LLM generation failed";
    throw new Error(`Draft generation failed: ${message}`);
  }

  // Citation guard: strip any [Sn] tags that aren't backed by a real source
  const { content, removed } = guardCitations(rawContent, sources);

  return {
    title: `${inputs.motionType} — ${inputs.caseTitle}`,
    content,
    sources,
    providerMeta,
    citationsRemoved: removed.length,
    citationsUnavailable,
  };
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

function generateMockDraft(inputs: MotionInputs): GeneratedMotion {
  const title = `${inputs.motionType} — ${inputs.caseTitle}`;
  const contextSection = inputs.additionalContext
    ? `\nAdditional Context: ${inputs.additionalContext}\n`
    : "";

  const content = `IN THE ${inputs.jurisdiction.toUpperCase()} COURT
${inputs.caseType.toUpperCase()} DIVISION

Case: ${inputs.caseTitle}
Filing Party Role: ${inputs.partyRole}

════════════════════════════════════════════════════════════
${inputs.motionType.toUpperCase()}
════════════════════════════════════════════════════════════

I. INTRODUCTION

The ${inputs.partyRole} in the above-captioned ${inputs.caseType} matter
respectfully moves this Court pursuant to applicable rules of procedure
for the relief described herein. This ${inputs.motionType} is supported by
the following facts and legal argument.

II. BACKGROUND AND STATEMENT OF FACTS

${inputs.facts}
${contextSection}
III. ARGUMENT

A. Legal Standard

[Legal standard applicable to a ${inputs.motionType} in
${inputs.jurisdiction} — to be completed by counsel based on
controlling authority. See [Counsel to insert citation].]

B. The Facts Support the Requested Relief

Based on the foregoing facts, the ${inputs.partyRole} submits that the
applicable legal standard is satisfied. [Counsel should develop this
section with specific citations to the record and controlling law.]

C. The Balance of Equities Favors the ${inputs.partyRole}

[Address any equitable considerations relevant to this motion type
under ${inputs.jurisdiction} law. See [Counsel to insert citation].]

IV. CONCLUSION AND REQUESTED RELIEF

For the foregoing reasons, the ${inputs.partyRole} respectfully requests
that this Court:

${inputs.reliefRequested}

Respectfully submitted,

_________________________________
[Attorney Name]
[Bar Number]
[Firm Name]
[Address]
[City, State, ZIP]
[Phone Number]
[Email Address]
Date: ___________________________

────────────────────────────────────────────────────────────
CERTIFICATE OF SERVICE

I hereby certify that on this date, a true and correct copy of the
foregoing ${inputs.motionType} was served upon all counsel of record via
[service method — e.g., CM/ECF, email, first-class mail].

_________________________________
[Attorney Signature]
────────────────────────────────────────────────────────────

⚠ DISCLAIMER: This document was generated by MotionForge as a
drafting aid only. It does NOT constitute legal advice, does not
create an attorney-client relationship, and must be reviewed,
completed, and modified by a licensed attorney before filing. No
case law or citations have been generated or verified. Do not
rely on this draft as legal counsel.`.trim();

  return {
    title,
    content,
    sources: [],
    providerMeta: null,
    citationsRemoved: 0,
    citationsUnavailable: false,
  };
}
