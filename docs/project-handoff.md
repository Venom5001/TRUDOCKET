# TruDocket — Project Handoff

Last updated: 2026-05-13

A guided legal-motion drafting SaaS for pro se litigants and small law firms. Users answer plain-language questions; the app produces a court-structured draft with optional citations.

---

## 1. Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 16.2.4 (App Router, Turbopack, Server Components, Server Actions, async `searchParams`) |
| Runtime | Node.js 20.x (Vercel) |
| UI | React 19.2.4, Tailwind v4, custom components only (no UI library) |
| Auth | Auth.js / NextAuth v5 beta with PrismaAdapter |
| DB | Neon Postgres (pooler URL), Prisma 7.5.0 with `@prisma/adapter-pg` |
| Payments | Stripe v20 (Checkout + Billing Portal + webhooks) |
| Tests | Vitest (37 unit) + Playwright (3 E2E) |
| Hosting | Vercel (production) |
| Email | Resend (magic-link auth) |

Key dirs:

- `src/app/` — App Router pages
  - `src/app/page.tsx` — landing
  - `src/app/pricing/page.tsx`
  - `src/app/signin/page.tsx` — custom multi-provider sign-in
  - `src/app/signin/verify/page.tsx` — "check your inbox" for magic links
  - `src/app/app/*` — authenticated app shell (`onboarding`, `create-motion`, `documents`, `cases`, `billing`)
  - `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
  - `src/app/api/stripe/{checkout,portal,webhook}/route.ts`
- `src/lib/` — core libs
  - `auth.ts` — provider config (conditional registration)
  - `prisma.ts` — Prisma client (pg adapter, safe build-time eval)
  - `stripe.ts` — **Proxy-based lazy Stripe client** (don't refactor without preserving lazy init — env vars are absent at build time on Vercel)
  - `entitlements.ts` — `canGenerate` gate (2 free drafts, unlimited on Pro)
  - `subscription.ts` — subscription read/sync helpers
- `src/lib/services/` — domain services
  - `motion-generator.ts`, `motion-validation.ts`
  - `llm/{openai,anthropic,router}.ts` — LLM provider routing
  - `caselaw/courtlistener.ts` — citation lookup
- `src/proxy.ts` — Next.js middleware (auth gate on `/app/:path*`)
- `prisma/schema.prisma` + `prisma/migrations/` — schema and migration history

---

## 2. Database

**Provider:** Neon (serverless Postgres). Set up via `npx neonctl@latest init`. `.neon` (orgId only, no secrets) is gitignored.

**Connection:** pooler URL with `?sslmode=require` in `DATABASE_URL`.

**Models** (`prisma/schema.prisma`):

- `User` — `id`, `email`, `emailVerified`, `stripeCustomerId` (unique), `onboardedAt`
- `Account`, `Session`, `VerificationToken` — NextAuth tables (don't rename)
- `Subscription` — `stripeSubscriptionId`, `stripePriceId`, `stripeCurrentPeriodEnd`, `status`
- `Case`, `Document` — user-scoped drafting domain
- `UsageEvent` — append-only event log (used for free-tier gating)

**Migrations applied (6):**

```text
20260323111900_init
20260405160212_add_motionforge_models
20260410091903_add_rag_fields
20260414105825_add_onboarded_at
20260414133000_add_document_clarifying_answers
20260417020252_motionforge_ai_foundation
```

**Running migrations on prod:**

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

`postinstall` runs `prisma generate` automatically on every Vercel build. Migrations are **not** auto-applied — run manually after schema changes.

---

## 3. Authentication

**Implemented:** multi-provider via Auth.js / NextAuth v5. Providers register conditionally based on env vars — unconfigured providers don't crash the build, they just don't render on the sign-in page.

**Provider priority (UI order on `/signin`):**

1. Continue with Google (primary)
2. Continue with Email (magic link via Resend)
3. Continue with GitHub (secondary)

**Account linking:** `allowDangerousEmailAccountLinking: true` on Google and GitHub. Same email = same user across providers. Resend magic links inherently prove email ownership. Documented in `src/lib/auth.ts` and README.

**Custom pages** (configured via `pages` in `auth.ts`):

- `/signin` — provider picker, redirect target after middleware bounce
- `/signin/verify` — post-email-submit "check your inbox" page
- Errors come through as `?error=<code>` and are mapped to user-friendly strings on `/signin`

**Session strategy:** database (PrismaAdapter); session callback exposes `session.user.id`.

**Callback URLs to register externally:**

- Google: `https://<APP_URL>/api/auth/callback/google`
- GitHub: `https://<APP_URL>/api/auth/callback/github`
- Resend: handled internally — nothing to register

---

## 4. Stripe Subscriptions

**Plans:** single Pro plan, $9/month.

**Flow:**

1. User clicks Subscribe → `POST /api/stripe/checkout` creates a Checkout Session
2. Stripe redirects to `/app/billing?success=1`
3. `BillingSuccessPoller` (`src/components/billing-success-poller.tsx`) refreshes the page every 2s up to 5 times waiting for the webhook to mark them Pro
4. Webhook at `/api/stripe/webhook` upserts the `Subscription` row
5. `getUserEntitlements()` reads subscription status and gates generation

**Webhook events handled:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

**Webhook signing:** `STRIPE_WEBHOOK_SECRET` is verified with `stripe.webhooks.constructEvent(...)`. Don't bypass this.

**Critical detail — lazy Stripe init:** `src/lib/stripe.ts` uses a JavaScript `Proxy` to defer Stripe client construction until the first method call, and `PLANS.pro.priceId` is a getter. This is required because `next build` evaluates route-handler modules (including `runtime = "nodejs"` exports), which previously triggered module-level `throw` on missing env vars and broke Vercel builds. Don't refactor back to top-level instantiation.

**Free tier:** 2 motion drafts total (tracked via `UsageEvent` rows with `actionType = "motion_generate"`). Enforced in `src/lib/entitlements.ts`.

---

## 5. Environment Variables

Templates: `.env.example` (local), `.env.production.example` (prod).

**Always required:**

| Var | Purpose |
| --- | --- |
| `APP_URL` | Public base URL, no trailing slash |
| `AUTH_URL` | Same as `APP_URL` in production |
| `AUTH_SECRET` | NextAuth signing key — generate with `openssl rand -hex 32` |
| `AUTH_TRUST_HOST` | Must be `true` on Vercel |
| `DATABASE_URL` | Neon pooler URL with `?sslmode=require` |
| `STRIPE_SECRET_KEY` | `sk_live_...` in prod, `sk_test_...` locally |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe Dashboard webhook endpoint |
| `STRIPE_PRICE_PRO_MONTHLY_ID` | Stripe Price ID for the Pro plan |

**At least one auth provider** (pair must be set):

| Var pair | Provider |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email magic link |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |

**Optional AI / external service keys** (only required if AI features are enabled):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `COURLISTENER_API_TOKEN`

---

## 6. Deployment Status

**Hosting:** Vercel. Project deploys from `master` branch.

**Build pipeline:** `npm ci` → `postinstall` (`prisma generate`) → `next build`.

**Last known-good build:** commit `8419673` (multi-provider auth). `npm run build` passes locally. Vercel build passes once env vars are populated.

**Current Vercel URL:** `https://trudocket-bmcu.vercel.app` (auto-generated, working).

**Custom domain:** `trudocket.org` — **purchased via IONOS, not yet wired up.** See section 8 below for the cutover plan.

**CI:** `.github/workflows/ci.yml` runs on push/PR to `main` or `master`. Node 20, installs Playwright Chromium, then `npm run test:all`.

---

## 7. Testing

Run all tests:

```bash
npm run test:all   # typecheck + vitest + playwright
```

**Last green run:** 37/37 unit + 3/3 E2E.

**Unit suites** (`src/__tests__/`):

- `citation-guard.test.ts` — strip citations when CourtListener is offline
- `env-guard.test.ts` — `isPro()` accepts only `active`/`trialing`
- `llm-router.test.ts` — provider routing logic
- `motion-validation.test.ts` — onboarding form parsing
- `plans.test.ts` — Stripe plan shape
- `user-scoping.test.ts` — Prisma queries filter by `userId`

**E2E** (`e2e/navigation.spec.ts`): landing → pricing → Pro card visible.

---

## 8. Domain Setup — IONOS → Vercel (PENDING)

The user purchased `trudocket.org` through IONOS. Cutover steps documented in chat but **not yet executed**:

1. Vercel dashboard → Settings → Domains → add `trudocket.org` and `www.trudocket.org` (apex canonical).
2. At IONOS DNS:
   - A record `@` → `76.76.21.21` (or whatever Vercel shows)
   - CNAME `www` → `cname.vercel-dns.com`
   - Delete IONOS parking records first.
3. Update Vercel env vars: `APP_URL`, `AUTH_URL` → `https://trudocket.org`; `EMAIL_FROM` → `TruDocket <no-reply@trudocket.org>`.
4. Update Google OAuth Authorized redirect URI: add `https://trudocket.org/api/auth/callback/google` (keep the Vercel one until cutover, then remove).
5. Update GitHub OAuth App (only allows one callback URL): swap Homepage + callback to `https://trudocket.org`.
6. In Resend: add `trudocket.org` as a sending domain, add the TXT/DKIM records they provide at IONOS DNS, wait for **Verified** status.
7. Redeploy on Vercel.
8. Smoke-test all three sign-in flows at `https://trudocket.org`.

Optional: MX records at IONOS if inbound mail to `@trudocket.org` is wanted (separate from outbound Resend setup).

---

## 9. Current Blockers

None that prevent further development. Operational pending items only:

- **Domain cutover not started** — `trudocket.org` is registered at IONOS but DNS still points at IONOS defaults. See section 8.
- **GitHub OAuth callback** — currently set to `https://trudocket-bmcu.vercel.app/api/auth/callback/github` (Client ID `Ov23liLOD2V8gx2moQQV`). Must be updated at cutover or sign-in breaks.
- **Google + Resend env vars** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` are in `.env.example` / `.env.production.example` but **not yet added to Vercel**. Until they are, only the GitHub provider renders on `/signin`. Code degrades gracefully — won't crash.

---

## 10. Recent History (relevant context)

- `8419673` — multi-provider auth (Google, Resend magic link, GitHub) with custom `/signin` page; all `/api/auth/signin` redirects updated to `/signin` preserving `callbackUrl`.
- `40e58a3` — fixed Vercel build crash by lazy-initializing the Stripe client (Proxy pattern). Don't undo this.
- `29fe766` — added `.neon` to `.gitignore` (Neon CLI artifact).
- `3bf545e` — npm audit cleanup via `overrides` block in `package.json` (effect, lodash, postcss, hono, defu). No `--force` used. **0 vulnerabilities** currently.
- `eace719` — UX polish: auth-aware landing CTA, post-checkout polling, humanized error messages, free-tier empty states.

---

## 11. Next Tasks (suggested order)

1. **Domain cutover** — execute section 8 end-to-end. Highest-leverage operational task.
2. **Populate Vercel env vars** for Google + Resend. Without these only GitHub renders.
3. **Smoke test all three sign-in paths** on production after cutover (Google, Email magic link, GitHub).
4. **Add a logout UI affordance** — currently no visible sign-out button in the app shell (`src/app/app/layout.tsx`). NextAuth's `signOut()` action exists; just needs wiring.
5. **Stripe live mode** — currently configured with whatever keys are in Vercel; verify `sk_live_...` is set before public launch and run a real $9 charge end-to-end.
6. **Webhook resilience** — Stripe webhook retries on non-2xx. Consider an idempotency check on `event.id` if double-processing becomes an issue.
7. **Account-linking review** — `allowDangerousEmailAccountLinking: true` is enabled on Google + GitHub for UX. Revisit if security model tightens (e.g., disable on GitHub since its primary-email-verified status isn't checked by NextAuth).

---

## 12. How to Continue This Project

```bash
git clone <repo>
cp .env.example .env.local        # fill in dev credentials
npm ci
npx prisma migrate deploy         # against your dev DB
npm run dev                       # localhost:3000
npm run test:all                  # before any PR
```

For production changes: edit, `npm run test:all`, commit to `master`, push → Vercel auto-deploys. Don't bypass pre-commit hooks. Don't amend pushed commits.

All deployment/setup detail lives in `README.md`. This handoff is the short version.
