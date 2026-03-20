import { describe, it, expect, vi } from "vitest";

vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY_ID", "price_test_123");

describe("Environment guard", () => {
  it("isPro only accepts valid subscription statuses", async () => {
    const { isPro } = await import("@/lib/stripe");

    const validActiveStatuses = ["active", "trialing"];
    const invalidStatuses = ["canceled", "incomplete", "past_due", "unpaid", "", null, undefined] as (string | null | undefined)[];

    for (const status of validActiveStatuses) {
      expect(isPro(status)).toBe(true);
    }

    for (const status of invalidStatuses) {
      expect(isPro(status)).toBe(false);
    }
  });
});
