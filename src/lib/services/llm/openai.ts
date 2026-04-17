// Uses the OpenAI Responses API (v1/responses), available since early 2025.
// Docs: https://platform.openai.com/docs/api-reference/responses

import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types";
import { LLMError } from "./types";

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 90_000;

interface ResponsesAPIInput {
  role: "user" | "assistant";
  content: string;
}

interface ResponsesAPIResponse {
  output: Array<{
    type: string;
    content: Array<{ type: string; text: string }>;
  }>;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    this.apiKey = key;
    this.model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
  }

  async chat(
    messages: LLMMessage[],
    opts: LLMOptions = {}
  ): Promise<LLMResponse> {
    const input: ResponsesAPIInput[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input,
          ...(opts.systemPrompt ? { instructions: opts.systemPrompt } : {}),
          max_output_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw new LLMError(
        `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
        "openai",
        null,
        true // network/timeout errors are retryable
      );
    }
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMError(
        `OpenAI API error ${response.status}: ${body}`,
        "openai",
        response.status,
        retryable
      );
    }

    const data = (await response.json()) as ResponsesAPIResponse;

    const text = (data.output ?? [])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("");

    return { content: text, model: this.model, provider: "openai" };
  }
}
