# Build Tasks (must complete all)

## 0. Setup
- Initialize Next.js app (App Router, TS, Tailwind)
- Install dependencies exactly as required
- Add Prisma schema and generate client

## 1. Auth
- Implement Auth.js with GitHub provider
- Ensure server components can read session and userId
- Add sign-in/out actions

## 2. Stripe
- Implement checkout route (subscription mode)
- Implement portal route
- Implement webhook route with signature verification
- Store stripeCustomerId on user
- Upsert subscription records by stripeSubscriptionId

## 3. UI
- Implement Landing, Pricing, Dashboard, Billing pages
- Use dark UI default, modern minimal cards/buttons
- Provide loading and error states client-side

## 4. Tests
- Add Vitest tests for plan config + environment guard
- Add Playwright smoke test for landing -> pricing navigation
- Add scripts: test, test:e2e, test:all

## 5. Quality Bar
- Typecheck must pass
- Lint must pass
- Tests must pass
- No TODO/placeholder comments
- No secrets committed
