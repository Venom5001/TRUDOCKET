import { describe, it, expect } from "vitest";
import { guardCitations } from "@/lib/services/motion-generator";
import type { CaseLawSource } from "@/lib/services/motion-generator";

function makeSource(id: string): CaseLawSource {
  return { id, title: `Case ${id}`, court: "Test Court", date: "2024-01-01", url: "https://example.com", snippet: "" };
}

describe("guardCitations", () => {
  it("preserves valid citation tags", () => {
    const sources = [makeSource("S1"), makeSource("S2")];
    const { content, removed } = guardCitations(
      "Per [S1] and [S2], the standard is met.",
      sources
    );
    expect(content).toContain("[S1]");
    expect(content).toContain("[S2]");
    expect(removed).toHaveLength(0);
  });

  it("removes a single hallucinated citation", () => {
    const sources = [makeSource("S1")];
    const { content, removed } = guardCitations(
      "See [S1]. Also see [S3] (hallucinated).",
      sources
    );
    expect(content).toContain("[S1]");
    expect(content).not.toContain("[S3]");
    expect(removed).toEqual(["[S3]"]);
  });

  it("removes multiple hallucinated citations", () => {
    const sources = [makeSource("S1"), makeSource("S2")];
    const { content, removed } = guardCitations(
      "[S1] is valid. [S4] and [S99] are not.",
      sources
    );
    expect(content).toContain("[S1]");
    expect(content).not.toContain("[S4]");
    expect(content).not.toContain("[S99]");
    expect(removed).toContain("[S4]");
    expect(removed).toContain("[S99]");
    expect(removed).toHaveLength(2);
  });

  it("removes all citation tags when no sources provided", () => {
    const { content, removed } = guardCitations(
      "Per [S1] and [S2], the law is settled.",
      []
    );
    expect(content).not.toMatch(/\[S\d+\]/);
    expect(removed).toHaveLength(2);
  });

  it("returns content unchanged when no citation markers present", () => {
    const { content, removed } = guardCitations(
      "No citations in this draft.",
      []
    );
    expect(content).toBe("No citations in this draft.");
    expect(removed).toHaveLength(0);
  });

  it("does not strip non-citation bracket patterns", () => {
    const sources = [makeSource("S1")];
    const { content } = guardCitations(
      "[S1] supports the argument. [Counsel to insert citation].",
      sources
    );
    expect(content).toContain("[S1]");
    expect(content).toContain("[Counsel to insert citation]");
  });

  it("handles duplicate valid citations correctly", () => {
    const sources = [makeSource("S1")];
    const { content, removed } = guardCitations(
      "[S1] at 5. See also [S1] at 10.",
      sources
    );
    expect(content.match(/\[S1\]/g)).toHaveLength(2);
    expect(removed).toHaveLength(0);
  });
});
