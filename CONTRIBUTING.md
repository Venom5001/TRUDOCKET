# Contributing Rules for AI Agents

## Hard rules
- Never commit secrets. Use .env.local.example for env vars.
- Keep Stripe and Auth server-only logic in server files.
- Always run: npm run typecheck && npm run test && npm run test:e2e
- Fix failures before finishing.
- Prefer small, readable components.
- Do not introduce unrelated dependencies.

## Output expectations
- Produce a working local dev experience with clear setup steps.
- Ensure webhook uses raw body (req.text()) and verifies signature.
