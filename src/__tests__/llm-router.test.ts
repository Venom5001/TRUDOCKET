import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMRouter } from "@/lib/services/llm/router";
import { LLMError } from "@/lib/services/llm/types";
import type {
  LLMProvider,
  LLMResponse,
  ProviderName,
} from "@/lib/services/llm/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(provider: ProviderName, model = "test-model"): LLMResponse {
  return { content: `response from ${provider}`, model, provider };
}

function makeLLMError(
  provider: ProviderName,
  statusCode: number | null,
  retryable: boolean
): LLMError {
  return new LLMError(
    `${provider} error (${statusCode ?? "network"})`,
    provider,
    statusCode,
    retryable
  );
}

/**
 * Build a mock provider that returns `attempts` in order.
 * The last entry is repeated if calls exceed the array length.
 */
function mockProvider(
  name: ProviderName,
  attempts: Array<LLMResponse | LLMError>
): LLMProvider {
  let i = 0;
  return {
    name,
    chat: vi.fn(async (): Promise<LLMResponse> => {
      const result = attempts[Math.min(i++, attempts.length - 1)];
      if (result instanceof LLMError) throw result;
      return result;
    }),
  };
}

/** Build a router with retryDelayMs=0 so tests are instant. */
function makeRouter(
  providers: Map<ProviderName, LLMProvider>,
  primary: ProviderName | null = null
): LLMRouter {
  return new LLMRouter(
    providers,
    { providerMode: "both", primary, fallback: null },
    0 // no delay in tests
  );
}

const MESSAGES = [{ role: "user" as const, content: "draft a motion" }];

// ─── Mode-based provider preference ──────────────────────────────────────────

describe("mode preference", () => {
  let anthropic: LLMProvider;
  let openai: LLMProvider;
  let providers: Map<ProviderName, LLMProvider>;

  beforeEach(() => {
    anthropic = mockProvider("anthropic", [makeResponse("anthropic")]);
    openai = mockProvider("openai", [makeResponse("openai")]);
    providers = new Map([
      ["anthropic", anthropic],
      ["openai", openai],
    ]);
  });

  it("mode=draft prefers Anthropic", async () => {
    const router = makeRouter(providers);
    const result = await router.chat(MESSAGES, {}, "draft");
    expect(result.provider).toBe("anthropic");
    expect(anthropic.chat).toHaveBeenCalledOnce();
    expect(openai.chat).not.toHaveBeenCalled();
  });

  it("mode=citations prefers Anthropic", async () => {
    const router = makeRouter(providers);
    const result = await router.chat(MESSAGES, {}, "citations");
    expect(result.provider).toBe("anthropic");
    expect(openai.chat).not.toHaveBeenCalled();
  });

  it("mode=review prefers OpenAI", async () => {
    const router = makeRouter(providers);
    const result = await router.chat(MESSAGES, {}, "review");
    expect(result.provider).toBe("openai");
    expect(openai.chat).toHaveBeenCalledOnce();
    expect(anthropic.chat).not.toHaveBeenCalled();
  });

  it("falls back to only available provider when preferred is absent", async () => {
    // Only OpenAI available, but mode=draft prefers Anthropic
    const router = makeRouter(new Map([["openai", openai]]));
    const result = await router.chat(MESSAGES, {}, "draft");
    expect(result.provider).toBe("openai");
  });

  it("LLM_PRIMARY overrides mode preference", async () => {
    // primary=openai but mode=draft (would normally prefer Anthropic)
    const router = makeRouter(providers, "openai");
    const result = await router.chat(MESSAGES, {}, "draft");
    expect(result.provider).toBe("openai");
    expect(anthropic.chat).not.toHaveBeenCalled();
  });
});

// ─── Retry behaviour ──────────────────────────────────────────────────────────

describe("retry on retryable errors", () => {
  it("retries once on 429, succeeds on second attempt", async () => {
    const provider = mockProvider("anthropic", [
      makeLLMError("anthropic", 429, true),
      makeResponse("anthropic"),
    ]);
    const router = makeRouter(new Map([["anthropic", provider]]));

    const result = await router.chat(MESSAGES, {});
    expect(result.provider).toBe("anthropic");
    expect(provider.chat).toHaveBeenCalledTimes(2);
  });

  it("retries twice on 500, succeeds on third attempt", async () => {
    const provider = mockProvider("anthropic", [
      makeLLMError("anthropic", 500, true),
      makeLLMError("anthropic", 500, true),
      makeResponse("anthropic"),
    ]);
    const router = makeRouter(new Map([["anthropic", provider]]));

    const result = await router.chat(MESSAGES, {});
    expect(result.provider).toBe("anthropic");
    expect(provider.chat).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on non-retryable 401", async () => {
    const provider = mockProvider("anthropic", [
      makeLLMError("anthropic", 401, false),
      makeResponse("anthropic"), // should never be reached
    ]);
    const router = makeRouter(new Map([["anthropic", provider]]));

    await expect(router.chat(MESSAGES, {})).rejects.toThrow("401");
    expect(provider.chat).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on non-retryable 400", async () => {
    const provider = mockProvider("anthropic", [
      makeLLMError("anthropic", 400, false),
    ]);
    const router = makeRouter(new Map([["anthropic", provider]]));

    await expect(router.chat(MESSAGES, {})).rejects.toThrow("400");
    expect(provider.chat).toHaveBeenCalledTimes(1);
  });

  it("caps retries at maxRetries (2) even if all attempts fail", async () => {
    const err = makeLLMError("openai", 503, true);
    const provider = mockProvider("openai", [err, err, err, err]);
    const router = makeRouter(new Map([["openai", provider]]));

    await expect(router.chat(MESSAGES, {})).rejects.toThrow("503");
    // 1 initial + 2 retries = 3 total calls
    expect(provider.chat).toHaveBeenCalledTimes(3);
  });
});

// ─── Fallback to secondary provider ──────────────────────────────────────────

describe("provider fallback", () => {
  it("falls back to secondary when primary exhausts retries", async () => {
    const anthropic = mockProvider("anthropic", [
      makeLLMError("anthropic", 500, true), // will retry × 2 then give up
      makeLLMError("anthropic", 500, true),
      makeLLMError("anthropic", 500, true),
    ]);
    const openai = mockProvider("openai", [makeResponse("openai")]);

    const router = makeRouter(
      new Map([
        ["anthropic", anthropic],
        ["openai", openai],
      ])
    );

    const result = await router.chat(MESSAGES, {}, "draft");
    expect(result.provider).toBe("openai");
    expect(anthropic.chat).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(openai.chat).toHaveBeenCalledTimes(1);
  });

  it("throws a combined error message when all providers fail", async () => {
    const anthropic = mockProvider("anthropic", [
      makeLLMError("anthropic", 500, true),
      makeLLMError("anthropic", 500, true),
      makeLLMError("anthropic", 500, true),
    ]);
    const openai = mockProvider("openai", [
      makeLLMError("openai", 503, true),
      makeLLMError("openai", 503, true),
      makeLLMError("openai", 503, true),
    ]);

    const router = makeRouter(
      new Map([
        ["anthropic", anthropic],
        ["openai", openai],
      ])
    );

    await expect(router.chat(MESSAGES, {})).rejects.toThrow(
      "All LLM providers failed"
    );
  });

  it("succeeds with only one provider configured", async () => {
    const openai = mockProvider("openai", [makeResponse("openai")]);
    const router = makeRouter(new Map([["openai", openai]]));

    const result = await router.chat(MESSAGES, {});
    expect(result.provider).toBe("openai");
  });

  it("throws when no providers are configured", async () => {
    const router = makeRouter(new Map());
    await expect(router.chat(MESSAGES, {})).rejects.toThrow(
      "No LLM providers are configured"
    );
  });
});

// ─── available flag ───────────────────────────────────────────────────────────

describe("available getter", () => {
  it("returns true when providers are registered", () => {
    const p = mockProvider("openai", [makeResponse("openai")]);
    const router = makeRouter(new Map([["openai", p]]));
    expect(router.available).toBe(true);
  });

  it("returns false when no providers are registered", () => {
    const router = makeRouter(new Map());
    expect(router.available).toBe(false);
  });
});
