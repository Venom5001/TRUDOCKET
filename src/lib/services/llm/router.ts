import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import {
  isRetryable,
  LLMError,
  type GenerationMode,
  type LLMMessage,
  type LLMOptions,
  type LLMProvider,
  type LLMResponse,
  type ProviderName,
} from "./types";

// ─── Mode → preferred provider ────────────────────────────────────────────────

/** When both providers are available, each mode has a preferred one. */
const MODE_PREFERENCE: Record<GenerationMode, ProviderName> = {
  draft: "anthropic",     // Claude excels at long-form legal prose
  citations: "anthropic", // structured citation-aware drafting
  review: "openai",       // GPT-4o preferred for analytical review
};

// ─── Config ───────────────────────────────────────────────────────────────────

interface RouterConfig {
  /**
   * `LLM_PROVIDER_MODE` env var:
   *   "both"       — use whichever providers have keys; one is primary, one fallback
   *   "anthropic"  — use Anthropic only (ignore OPENAI_API_KEY)
   *   "openai"     — use OpenAI only (ignore ANTHROPIC_API_KEY)
   */
  providerMode: "both" | "anthropic" | "openai";
  /** Explicit primary from `LLM_PRIMARY` env var — overrides mode preference. */
  primary: ProviderName | null;
  /** Explicit fallback from `LLM_FALLBACK` env var — only effective in "both" mode. */
  fallback: ProviderName | null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export class LLMRouter {
  constructor(
    private readonly providers: ReadonlyMap<ProviderName, LLMProvider>,
    private readonly config: RouterConfig,
    /** Delay between retries in ms. Set to 0 in tests. */
    private readonly retryDelayMs = 1_000
  ) {}

  get available(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Ordered list of provider names to attempt: [primary, fallback?].
   * Respects LLM_PRIMARY env var first, then mode preference, then insertion order.
   */
  private orderedProviders(mode?: GenerationMode): ProviderName[] {
    const keys = [...this.providers.keys()];
    if (keys.length === 0) return [];
    if (keys.length === 1) return keys;

    // Explicit override via LLM_PRIMARY
    if (this.config.primary && this.providers.has(this.config.primary)) {
      const rest = keys.filter((k) => k !== this.config.primary);
      return [this.config.primary, ...rest];
    }

    // Mode-based preference
    if (mode) {
      const preferred = MODE_PREFERENCE[mode];
      if (this.providers.has(preferred)) {
        const rest = keys.filter((k) => k !== preferred);
        return [preferred, ...rest];
      }
    }

    return keys;
  }

  /**
   * Chat with automatic retry on 429/5xx/timeout and provider fallback.
   *
   * Retry policy per provider: up to 2 retries, exponential backoff
   * (retryDelayMs × 2^attempt).  After exhausting retries on the primary,
   * the router moves to the next provider.  If all fail, throws a combined
   * Error listing every failure.
   */
  async chat(
    messages: LLMMessage[],
    opts: LLMOptions = {},
    mode?: GenerationMode
  ): Promise<LLMResponse> {
    const order = this.orderedProviders(mode);
    if (order.length === 0) {
      throw new Error("No LLM providers are configured.");
    }

    const failures: string[] = [];

    for (const providerName of order) {
      const provider = this.providers.get(providerName)!;
      try {
        return await this.callWithRetry(provider, messages, opts);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`[${providerName}] ${msg}`);
        // Try the next provider in the list
      }
    }

    throw new Error(
      `All LLM providers failed:\n${failures.join("\n")}`
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async callWithRetry(
    provider: LLMProvider,
    messages: LLMMessage[],
    opts: LLMOptions,
    maxRetries = 2
  ): Promise<LLMResponse> {
    let lastErr: unknown = new Error("Unknown");

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
      }
      try {
        return await provider.chat(messages, opts);
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) break; // fatal error: bail immediately
      }
    }

    throw lastErr;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Builds an LLMRouter from environment variables.
 * Returns null when no provider keys are available (falls back to mock draft).
 *
 * Relevant env vars:
 *   LLM_PROVIDER_MODE   "both" | "anthropic" | "openai"  (default: "both")
 *   LLM_PRIMARY         "anthropic" | "openai"            (optional)
 *   LLM_FALLBACK        "anthropic" | "openai"            (optional)
 *   ANTHROPIC_API_KEY
 *   OPENAI_API_KEY
 *   LLM_MODEL           override model for the chosen provider
 */
export function getRouter(): LLMRouter | null {
  const providerMode = (
    process.env.LLM_PROVIDER_MODE ?? "both"
  ) as RouterConfig["providerMode"];

  const primary = (process.env.LLM_PRIMARY ?? null) as ProviderName | null;
  const fallback = (process.env.LLM_FALLBACK ?? null) as ProviderName | null;

  const wantAnthropic =
    providerMode === "both" || providerMode === "anthropic";
  const wantOpenAI = providerMode === "both" || providerMode === "openai";

  const providers = new Map<ProviderName, LLMProvider>();

  if (wantAnthropic && process.env.ANTHROPIC_API_KEY) {
    try {
      providers.set("anthropic", new AnthropicProvider());
    } catch {
      /* key present but malformed — skip */
    }
  }
  if (wantOpenAI && process.env.OPENAI_API_KEY) {
    try {
      providers.set("openai", new OpenAIProvider());
    } catch {
      /* key present but malformed — skip */
    }
  }

  if (providers.size === 0) return null;

  return new LLMRouter(providers, { providerMode, primary, fallback });
}

// Re-export error type so callers can catch LLMError without importing from types
export { LLMError } from "./types";
