This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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
- `AUTH_URL` — full public auth callback URL for production
- `AUTH_TRUST_HOST=true` — required for Vercel-style host trust handling
- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret
- `STRIPE_SECRET_KEY` — Stripe secret key (test keys locally, live keys in production)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY_ID` — Stripe price ID for the Pro monthly plan

Optional keys that may be added later:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `COURLISTENER_API_TOKEN`

## Local Development

This project uses `next dev` for local development and `npm run test:all` to validate the full suite.

Run the full setup locally:

```bash
npm ci
cp .env.example .env.local
# edit .env.local with your local values
npm run dev
```

## Production Deploy (Vercel)

1. Push the repository to GitHub.
2. Create a Vercel project and connect your GitHub repository.
3. Add the required production environment variables in Vercel:
   - `APP_URL`
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `AUTH_TRUST_HOST`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_PRO_MONTHLY_ID`
4. Set `AUTH_TRUST_HOST=true` in Vercel.
5. Confirm `APP_URL` and `AUTH_URL` both point to your production URL, for example `https://your-domain.com`.
6. Deploy the project.

### Vercel Build Notes

A `postinstall` script now runs `npm run prisma:generate`, so the Prisma client is generated automatically during install.

If you need to run database migrations in production, use:

```bash
npx prisma migrate deploy
```

## Stripe Live Mode Setup

For production Stripe live mode:

1. Create a Stripe product named `Pro`.
2. Add a monthly recurring price and copy the price ID.
3. Add the live secret key to `STRIPE_SECRET_KEY`.
4. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.
5. Add the price ID to `STRIPE_PRICE_PRO_MONTHLY_ID`.

### Stripe webhook endpoint

Use the production endpoint:

```text
https://<YOUR_DOMAIN>/api/stripe/webhook
```

Select these webhook event types in Stripe:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## GitHub Actions CI

A CI workflow is configured in `.github/workflows/ci.yml`.
It runs on PRs and pushes to `main`, installs dependencies with `npm ci`, and runs `npm run test:all`.

## GitHub OAuth App Setup

For production GitHub auth:

1. Create a GitHub OAuth App in GitHub settings.
2. Set the callback URL to:

```text
https://<YOUR_DOMAIN>/api/auth/callback/github
```

3. Use the generated client ID and secret in Vercel environment variables.
