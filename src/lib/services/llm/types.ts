// ─── Core types ───────────────────────────────────────────────────────────────

export type ProviderName = "anthropic" | "openai";

/** Which generation task is being performed — used by the router to pick
 *  the most suitable provider when both are available. */
export type GenerationMode = "draft" | "citations" | "review";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  systemPrompt?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: ProviderName;
}

export interface LLMProvider {
  readonly name: ProviderName;
  chat(messages: LLMMessage[], opts?: LLMOptions): Promise<LLMResponse>;
}

// ─── Typed error ──────────────────────────────────────────────────────────────

/** Thrown by provider implementations instead of a plain Error so the router
 *  can decide whether to retry or immediately fall back. */
export class LLMError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderName,
    /** HTTP status code, or null for network/timeout errors. */
    readonly statusCode: number | null,
    /** True when the router should retry or try a fallback provider. */
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/** Returns true for errors that are worth retrying (rate limits, server
 *  errors, timeouts). Returns false for auth/validation failures. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof LLMError) return err.retryable;
  // Treat any AbortError (from AbortController.abort()) as a timeout — retryable.
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}
