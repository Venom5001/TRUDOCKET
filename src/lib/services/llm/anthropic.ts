import type { LLMMessage, LLMOptions, LLMProvider, LLMResponse } from "./types";
import { LLMError } from "./types";

const DEFAULT_MODEL = "claude-opus-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 90_000;

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    this.apiKey = key;
    this.model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
  }

  async chat(
    messages: LLMMessage[],
    opts: LLMOptions = {}
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
          messages,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      // Network error or abort (timeout)
      throw new LLMError(
        `Anthropic request failed: ${err instanceof Error ? err.message : String(err)}`,
        "anthropic",
        null,
        true // network/timeout errors are retryable
      );
    }
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMError(
        `Anthropic API error ${response.status}: ${body}`,
        "anthropic",
        response.status,
        retryable
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return { content: text, model: this.model, provider: "anthropic" };
  }
}
