# TruDocket

A Next.js SaaS application with multi-provider auth (Google, Email/Resend, GitHub), Stripe subscriptions, and Prisma + PostgreSQL.

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
- `STRIPE_SECRET_KEY` — Stripe secret key (test keys locally, live keys in production)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY_ID` — Stripe price ID for the Pro monthly plan

Auth providers — **at least one** must be configured. Each activates automatically when its env vars are present:

- **Google OAuth (primary)** — set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Email magic links via Resend** — set `RESEND_API_KEY` and `EMAIL_FROM`
- **GitHub OAuth (secondary)** — set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

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

### Step 3 — Configure Auth Providers

Configure at least one provider. **Google + Email is the recommended combination** for a mainstream SaaS audience.

#### 3a. Google OAuth (recommended primary)

1. Go to **[Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Create a new project (or pick an existing one).
3. **OAuth consent screen** → configure with your app name, support email, and your production domain under **Authorized domains**.
4. **Credentials → Create credentials → OAuth client ID** → **Web application**.
5. Under **Authorized redirect URIs**, add exactly:

   ```text
   https://<YOUR_DOMAIN>/api/auth/callback/google
   ```

   For local development also add:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

6. Click **Create**, then copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

#### 3b. Email Magic Links via Resend (recommended secondary)

1. Sign up at **[resend.com](https://resend.com)** and verify your sending domain (or use the sandbox domain for testing).
2. Go to **API Keys → Create API Key** with **Sending** permission. Copy it into `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified sender on your domain, e.g.:

   ```text
   EMAIL_FROM="TruDocket <no-reply@your-domain.com>"
   ```

   The sender domain must be verified in Resend (under **Domains**), otherwise sends will be rejected.

No additional NextAuth callback URL is required — magic links are handled internally at `/api/auth/callback/resend`.

#### 3c. GitHub OAuth (secondary / dev-friendly)

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to your production URL, e.g. `https://your-app.vercel.app`.
3. Set **Authorization callback URL** exactly to:

   ```text
   https://<YOUR_DOMAIN>/api/auth/callback/github
   ```

4. Click **Register application**, then copy the **Client ID** and generate a **Client secret** into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

> **Note on account linking:** Google and GitHub providers are configured with `allowDangerousEmailAccountLinking: true` so users can sign in with either provider using the same email and get the same account. Resend magic links proves email ownership directly. Disable this in `src/lib/auth.ts` if your threat model requires stricter separation.

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

In the Vercel project dashboard under **Settings → Environment Variables**, add the following for the **Production** environment.

Always required:

```text
APP_URL
DATABASE_URL
AUTH_SECRET
AUTH_URL
AUTH_TRUST_HOST
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY_ID
```

At least one auth provider (add both env vars for any provider you enable):

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

RESEND_API_KEY
EMAIL_FROM

GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
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

- [ ] **Sign in (Google)** — visit the production URL → `/signin` → click **Continue with Google**; you are redirected back and land on `/app`.
- [ ] **Sign in (Email)** — sign out, click **Continue with Email**, enter your address, open the email, click the link; you land on `/app` as the same user.
- [ ] **Sign in (GitHub, if enabled)** — sign out, click **Continue with GitHub**; you are redirected back and land on `/app`.
- [ ] **Generate (free tier)** — complete onboarding and generate a motion draft; it succeeds.
- [ ] **Free limit** — attempt a second draft; the app shows an upgrade prompt (free limit is 1).
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

### Auth Provider Callback URLs

| Provider | Callback URL to register |
| --- | --- |
| Google | `https://<YOUR_DOMAIN>/api/auth/callback/google` |
| GitHub | `https://<YOUR_DOMAIN>/api/auth/callback/github` |
| Resend (email) | handled internally — no external registration needed |

### GitHub OAuth App

| Field | Value |
| --- | --- |
| Homepage URL | `https://<YOUR_DOMAIN>` |
| Authorization callback URL | `https://<YOUR_DOMAIN>/api/auth/callback/github` |

### Stripe Webhook

| Field | Value |
|---|---|
| Endpoint URL | `https://<YOUR_DOMAIN>/api/stripe/webhook` |
| Events | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` |
