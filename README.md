# TruDocket

A Next.js SaaS application with GitHub OAuth, Stripe subscriptions, and Prisma + PostgreSQL.

## Getting Started (Local)

1. Copy local environment settings:

   ```bash
   cp .env.example .env.local
   ```

2. Fill `.env.local` with your local test credentials and database URL.

3. Install dependencies and run locally:

   ```bash
   npm ci
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

Create `.env.local` from `.env.example` for local development. For production, use `.env.production.example` as a template.

Required variables:

- `APP_URL` — app base URL, e.g. `http://localhost:3000` or `https://your-domain.com`
- `DATABASE_URL` — Postgres connection string for Prisma
- `AUTH_SECRET` — strong random string used by NextAuth
- `AUTH_URL` — full public URL used for auth callbacks (same as `APP_URL` in production)
- `AUTH_TRUST_HOST=true` — required for Vercel-style host trust handling
- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret
- `STRIPE_SECRET_KEY` — Stripe secret key (test keys locally, live keys in production)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY_ID` — Stripe price ID for the Pro monthly plan

Optional (AI/external features):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `COURLISTENER_API_TOKEN`

## Local Development

```bash
npm ci
cp .env.example .env.local
# edit .env.local with your local values
npx prisma migrate deploy   # apply migrations to local DB
npm run dev
```

Run the full test suite:

```bash
npm run test:all
```

---

## Deploy to Vercel (Production)

### Step 1 — Provision a Hosted Postgres Database

Choose one provider (all work with Prisma + `pg`):

- **[Neon](https://neon.tech)** — serverless Postgres, free tier, Vercel integration available
- **[Supabase](https://supabase.com)** — managed Postgres with free tier
- **[Railway](https://railway.app)** — simple provisioning, generous free tier

After creating a database, copy the **connection string**. For Neon, use the **pooler** URL:

```
postgresql://USER:PASSWORD@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

This becomes your `DATABASE_URL`.

### Step 2 — Run Database Migrations

Run migrations against the production database **before the first deploy**:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or if you use the Vercel CLI:

```bash
vercel env pull .env.production.local
npx dotenv -e .env.production.local -- npx prisma migrate deploy
```

> The `postinstall` script runs `prisma generate` automatically on every Vercel build. You only need to run `migrate deploy` manually on first deploy and after each schema change.

### Step 3 — Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to your production URL, e.g. `https://your-app.vercel.app`.
3. Set **Authorization callback URL** exactly to:

   ```
   https://<YOUR_DOMAIN>/api/auth/callback/github
   ```

4. Click **Register application**, then copy the **Client ID** and generate a **Client secret**.

### Step 4 — Create and Configure the Stripe Webhook

1. In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), click **Add endpoint**.
2. Set the endpoint URL to:

   ```
   https://<YOUR_DOMAIN>/api/stripe/webhook
   ```

3. Under **Select events**, add exactly these four events:

   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   ```

4. Click **Add endpoint**, then reveal and copy the **Signing secret** (`whsec_...`) — this becomes `STRIPE_WEBHOOK_SECRET`.
5. In **Products → Add product**, create a product named `Pro` with a monthly recurring price. Copy the **Price ID** (`price_...`) — this becomes `STRIPE_PRICE_PRO_MONTHLY_ID`.

### Step 5 — Set Vercel Environment Variables

In the Vercel project dashboard under **Settings → Environment Variables**, add all of the following for the **Production** environment:

```
APP_URL
DATABASE_URL
AUTH_SECRET
AUTH_URL
AUTH_TRUST_HOST
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY_ID
```

Value notes:

- `APP_URL` and `AUTH_URL` must both be your full production URL (e.g. `https://your-app.vercel.app`) with no trailing slash.
- `AUTH_TRUST_HOST` must be `true`.
- `AUTH_SECRET` — generate with `openssl rand -hex 32`.
- `STRIPE_SECRET_KEY` — use `sk_live_...` for production (not `sk_test_...`).

Optional variables (only if AI features are enabled):

```
OPENAI_API_KEY
ANTHROPIC_API_KEY
COURLISTENER_API_TOKEN
```

### Step 6 — Deploy

Push to `master` (or trigger a Vercel deployment from the dashboard). The build runs `npm ci` → `postinstall` → `prisma generate` → `next build`.

Confirm the deployment log shows no errors before running the smoke test.

### Step 7 — Smoke Test Checklist

Verify the full auth → generate → subscribe → Pro path after each production deploy:

- [ ] **Sign in** — visit the production URL and click **Sign in with GitHub**; you are redirected back and land on `/app` with your profile visible.
- [ ] **Generate (free tier)** — complete onboarding and generate a motion draft; it succeeds.
- [ ] **Free limit** — generate a second draft; a third attempt shows an upgrade prompt (free limit is 2).
- [ ] **Subscribe** — click **Upgrade to Pro** and complete the Stripe checkout.
- [ ] **Redirect** — after checkout you land on `/app/billing?success=1`.
- [ ] **Webhook delivery** — in the Stripe Dashboard under **Webhooks → your endpoint**, confirm `checkout.session.completed` was delivered and returned HTTP `200`.
- [ ] **Pro access** — return to `/app`; your plan shows **Pro** and unlimited generation is available.
- [ ] **Billing portal** — on `/app/billing`, click **Manage subscription**; the Stripe portal opens and shows your active subscription.
- [ ] **Subscription update** — from the billing portal, cancel the subscription; verify `/app` reflects the change on next page load (the webhook delivers `customer.subscription.updated`).

---

## GitHub Actions CI

A CI workflow is configured in `.github/workflows/ci.yml`.
It runs on PRs and pushes to `main` or `master`, installs dependencies with `npm ci`, installs Playwright browsers, and runs `npm run test:all` (typecheck + unit + E2E).

---

## Reference Tables

### GitHub OAuth App

| Field | Value |
|---|---|
| Homepage URL | `https://<YOUR_DOMAIN>` |
| Authorization callback URL | `https://<YOUR_DOMAIN>/api/auth/callback/github` |

### Stripe Webhook

| Field | Value |
|---|---|
| Endpoint URL | `https://<YOUR_DOMAIN>/api/stripe/webhook` |
| Events | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` |
