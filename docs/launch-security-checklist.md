# Kurioticket Launch Security Checklist

Use this before pushing, deploying, or going live.

## Environment Variables

- Real keys must live only in `.env.local` for local development or Render environment variables for deployed services.
- Do not commit `.env`, `.env.local`, `.env.production`, or any other real env file.
- Commit only `.env.example`, with placeholder values and no real secrets.
- Only variables prefixed with `NEXT_PUBLIC_` may be exposed to browser code.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public by design.
- Stripe secret key, Stripe webhook secret, travel API keys, Resend key, OpenAI key, database URL, auth secret, and Google OAuth secret must stay server-side.

## Required Live Services

- `DATABASE_URL`
- `AUTH_SECRET` and `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` if Google login is enabled
- `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`
- `DUFFEL_API_KEY`
- `KIWI_API_KEY` or `TRAVELPAYOUTS_API_KEY`
- `HOTEL_API_KEY` or approved hotel provider credentials
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `OPENAI_API_KEY`
- `ADMIN_EMAILS`

## Before GitHub Push

Run:

```bash
npm run security:secrets
git status --short
git ls-files .env .env.local .env.production
```

Expected:

- Secret verification passes.
- No `.env` files appear in tracked files.
- No real provider keys appear in source, README, screenshots, logs, fixtures, tests, or commits.

Enable or expect GitHub Secret Protection and secret scanning for the repository. If any secret is accidentally committed, remove it from history where practical, rotate the key immediately, and audit provider logs.

## Before Render Launch

- Verify all Render environment variables are present in the web service.
- Verify `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` match the production domain.
- Verify the Render PostgreSQL `DATABASE_URL` is attached.
- Run Prisma migrations against production intentionally.
- Confirm `/api/health` returns OK.
- Confirm travel provider API calls work server-side.
- Confirm missing or failed live providers show maintenance messages in production/staging and that local fallback data only runs when explicitly enabled.

## Provider Checks

- Amadeus credentials work server-side.
- Duffel API key works server-side.
- Kiwi or Travelpayouts key works server-side.
- Hotel provider key works server-side.
- Stripe is in the intended mode for launch.
- Stripe webhook endpoint is configured to `/api/stripe/webhook`.
- Resend sending domain is authenticated for Kurioticket / `kurioticket.com`, and `RESEND_FROM_EMAIL` is set to a verified sender on the active Kurioticket domain after DNS verification.
- OpenAI key works server-side and premium AI features use provider data as truth.

## Client Exposure Check

- Search client bundles for secret names and token patterns before launch.
- Confirm browser code references only `NEXT_PUBLIC_` variables.
- Confirm provider calls happen only through backend routes and services.
