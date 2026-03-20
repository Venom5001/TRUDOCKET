import { describe, it, expect, vi } from "vitest";

// Set env vars before importing the module
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY_ID", "price_test_123");

describe("isPro", () => {
  it("returns true for active status", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro("active")).toBe(true);
  });

  it("returns true for trialing status", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro("trialing")).toBe(true);
  });

  it("returns false for canceled status", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro("canceled")).toBe(false);
  });

  it("returns false for past_due status", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro("past_due")).toBe(false);
  });

  it("returns false for null", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro(null)).toBe(false);
  });

  it("returns false for undefined", async () => {
    const { isPro } = await import("@/lib/stripe");
    expect(isPro(undefined)).toBe(false);
  });
});

describe("PLANS config", () => {
  it("has a pro plan with required fields", async () => {
    const { PLANS } = await import("@/lib/stripe");
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.pro.name).toBe("Pro");
    expect(PLANS.pro.features).toBeInstanceOf(Array);
    expect(PLANS.pro.features.length).toBeGreaterThan(0);
  });
});
