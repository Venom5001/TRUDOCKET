# SaaS MVP: Next.js + Auth + Prisma + Stripe Subscriptions

## Stack
- Next.js App Router + TypeScript
- Tailwind UI (minimal components)
- Auth.js (NextAuth v5) with GitHub OAuth
- Prisma + Postgres
- Stripe: Checkout (subscription) + Billing Portal + Webhook sync
- Tests: Vitest + Playwright

## Required Pages
- / (Landing)
- /pricing (Plan card(s) with Subscribe button)
- /app (Dashboard gated by subscription)
- /app/billing (Billing portal button)

## Required APIs
- POST /api/stripe/checkout -> creates Stripe Checkout Session (subscription)
- POST /api/stripe/portal -> creates Stripe Billing Portal Session
- POST /api/stripe/webhook -> verifies signature, upserts subscription in DB
- Auth routes: /api/auth/[...nextauth]

## Subscription Entitlement
- A user is "Pro" if DB has subscription status in ["active","trialing"].

## Non-goals
- No multi-tenant orgs yet.
- No metered billing yet.
