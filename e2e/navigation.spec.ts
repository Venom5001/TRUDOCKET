import { test, expect } from "@playwright/test";

test("landing page loads and has pricing link", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TruDocket/);
  const pricingLink = page.getByRole("link", { name: /pricing/i });
  await expect(pricingLink).toBeVisible();
});

test("can navigate from landing to pricing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /view pricing/i }).click();
  await expect(page).toHaveURL("/pricing");
  await expect(page.getByRole("heading", { name: /simple pricing/i })).toBeVisible();
});

test("pricing page shows plan options", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  await expect(page.getByRole("button", { name: /subscribe/i })).toBeVisible();
});
