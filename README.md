# Kurioticket

Kurioticket is an Intelligent Stress-Free Travel Confidence Platform. Phase 1 focuses on premium flight, hotel, and car search systems, normalized provider results, safe external provider redirects, account dashboards, price alerts, premium subscription plumbing, support, legal pages, admin foundations, and Render deployment readiness.

Kurioticket is not an airline, OTA, or ticket issuer. Users compare options on Kurioticket and continue externally to airlines, hotels, affiliate partners, or travel providers for current pricing, rules, availability, and purchase steps.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- PostgreSQL with Prisma
- NextAuth credentials and Google auth
- Duffel flight provider integration plus production-ready hotel and car provider service architecture
- Stripe Checkout, subscriptions, webhooks, billing portal
- Resend transactional email
- OpenAI API for premium travel intelligence
- Render Blueprint deployment

## Local Setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` and fill provider credentials:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET` and `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `DUFFEL_API_KEY` for the active flight provider path
- Hotel provider credentials only when enabling an approved/configured hotel provider
- Car provider credentials only when enabling an approved/configured car provider
- `ADMIN_EMAILS`
- `ENABLE_DEVELOPMENT_FALLBACKS` should remain `false` outside intentional local testing

Never commit `.env` or `.env.local`. Only `NEXT_PUBLIC_` values may be used in browser code. Travel provider keys, Stripe secret keys, Resend keys, OpenAI keys, database URLs, and auth secrets must remain server-side.

### Auth and Google OAuth

Authentication uses NextAuth credentials plus optional Google OAuth. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to show the Google button on sign-in/sign-up. If either variable is missing, the Google button is hidden gracefully.

Allowed Google OAuth callback URLs should match the active deployed domains in Google OAuth Console. Use Kurioticket callback URLs for staging and production.

Staging:

- `https://staging.kurioticket.com/api/auth/callback/google`

Production:

- `https://www.kurioticket.com/api/auth/callback/google`
- `https://kurioticket.com/api/auth/callback/google`

Admin access is controlled only by comma-separated `ADMIN_EMAILS` values. Emails are trimmed and normalized to lowercase, for example `ADMIN_EMAILS=admin@zentricresearch.com`.

## Prisma

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

For production:

```bash
npm run db:deploy
```

Render uses:

```bash
npm run db:deploy:render
```

The Render migration command first detects whether an existing Render PostgreSQL database already has application tables but no `_prisma_migrations` history. When that legacy state is found, it baselines the initial Prisma migration before applying pending migrations so deployments do not fail on already-existing tables.

The schema includes users, auth sessions, subscriptions, saved flights/hotels/searches, search history, price alerts, support tickets, redirect logs, provider logs, notifications, preferences, trips, legal documents, feature flags, analytics, and provider health logs.

## Travel Provider Setup

Provider calls happen only in backend services under `src/services/travel`.

- Duffel is the only active working flight provider path today. Configure `FLIGHT_PROVIDER_PRIMARY=duffel`, `DUFFEL_API_MODE=live`, and `DUFFEL_API_KEY` for production flight search.
- Hotels remain enabled and production-ready for approved provider access/integration. Hotel live inventory, prices, availability, and booking links should appear only when an approved/configured hotel provider is active for that environment.
- Cars remain enabled and production-ready for approved provider access/integration. Car live inventory, prices, availability, and booking links should appear only when an approved/configured car provider is active for that environment.
- Optional/future provider variables may remain documented in `.env.example`, but they are not required for the current launch unless the corresponding approved hotel or car provider is intentionally enabled.

Provider credentials missing, unavailable, or rate-limited never produce fake live results in production or staging. Kurioticket must not show fake providers, prices, inventory, availability, booking links, or supplier approval. Local fallback data is paused by default and only runs when `ENABLE_DEVELOPMENT_FALLBACKS=true` is set locally. Raw provider responses are never returned to users.

### Duffel Setup

Set `DUFFEL_API_KEY` in Render and local `.env.local` when testing live searches. Duffel calls are made only from backend services with `Authorization: Bearer <token>` and the `Duffel-Version` header. Kurioticket creates live offer requests and normalizes offers into the internal flight result shape for metasearch comparison. No other flight provider should be presented as active for the current launch.

### Hotel and Car Provider Setup

Keep hotel and car systems enabled and provider-ready. Configure hotel or car provider credentials only after the provider has been approved for the target environment, and show live hotel or car inventory/prices only after that provider is active and configured. Missing hotel or car provider credentials should produce maintenance/unavailable messaging rather than simulated live supply.

### Provider Health Checks

Admins can review provider status at `/admin`. The admin-only endpoint `/api/admin/provider-health` reports Duffel configured/missing state, connection test result, response latency, sanitized last error, and environment readiness. Provider errors are logged internally and sanitized before returning to the browser.

## Stripe Setup

Create monthly and annual subscription prices in Stripe:

- Monthly: `$9.99/month`
- Annual: `$79/year`
- Trial: configured as `7` days in checkout session creation

Set:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`

Webhook route:

```text
/api/stripe/webhook
```

## Resend Setup

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. The production sender domain should be verified for Kurioticket / `kurioticket.com` before production email traffic. After DNS verification, set `RESEND_FROM_EMAIL` to a verified sender on the active Kurioticket domain. Resend is used for support confirmations and future price alert emails.

## OpenAI Setup

Set `OPENAI_API_KEY`. Premium AI routes use provider/search data as truth and are instructed not to invent prices, availability, baggage rules, policies, or guaranteed savings.

## Render Deployment

This repository includes `render.yaml` for a Render Blueprint:

- Production Node web service on `main`
- Staging Node web service on `dev`
- Separate production and staging Render PostgreSQL databases
- `/api/health` health check
- production and staging env var placeholders with secrets marked `sync: false`

Production deployment flow:

```bash
git add .
git commit -m "Describe production-ready change"
git push origin main
```

Then open:

```text
https://dashboard.render.com/blueprint/new
```

Select the GitHub repository, fill secret environment variables, apply the Blueprint, and run `npm run db:deploy` after migrations exist.

Production keys must be added in Render environment variables only. Local keys belong in `.env.local`, which is ignored by git.

Kurioticket is the forward-facing brand/domain.

Primary production domains:

- `kurioticket.com`
- `www.kurioticket.com`


Staging may use either the Render staging URL or `staging.kurioticket.com`. If using a custom staging domain, add the domain to the staging Render service and create the DNS record GoDaddy/Render asks for.

Use separate production and staging values for Stripe, Resend, OpenAI, Duffel, approved hotel/car providers, database, auth, and app URL environment variables. Staging must not share production payment webhooks unless intentionally configured by the infrastructure owner.

## GitHub Branch Workflow

Branches:

- `main`: production branch connected to the public Render production service
- `dev`: staging/integration branch connected to the Render staging service
- `frontend/*`: frontend feature branches such as `frontend/homepage-polish`, `frontend/flight-results-page`, `frontend/mobile-refactor`
- `backend/*`: backend feature branches such as `backend/duffel-provider`, `backend/travelpayouts-provider`, `backend/provider-health`

Required flow:

```text
feature branch
-> Pull Request into dev
-> staging deployment
-> admin review
-> merge into dev
-> final approval
-> merge dev into main
-> production deployment
```

No developer should push directly to `main`. Protect `main` in GitHub with required pull requests, required status checks, and administrator review. Frontend contributors should open PRs into `dev`; the admin/backend lead approves staging and performs the final production merge.

## PR Review Process

Frontend PRs must include desktop screenshots, mobile screenshots, a page summary, testing notes, and confirmation that `npm run lint` and `npm run build` passed. They also need confirmation of no console errors, no broken navigation, and mobile/desktop testing.

Frontend PRs cannot be approved unless the UI is responsive, premium-quality, uncluttered, navigable, and includes loading, error, and empty states.

Backend PRs must protect secrets, document new environment variables, preserve provider abstraction, gracefully handle provider failures, avoid exposing raw provider responses, and update README and `.env.example` when configuration changes.

Backend verification before merge:

```bash
npm run lint
npm run build
npx prisma validate
npx prisma generate
```

## Team Workflow

- Keep provider-specific logic isolated in `src/services/travel/providers`.
- Normalize all travel data before returning it to the UI.
- Use server routes for all provider, Stripe, Resend, OpenAI, and database work.
- Keep UI components reusable under `src/components`.
- Add feature flags for risky experiments before exposing them broadly.
- Do not expose API keys or raw provider payloads to the browser.

## Security Notes

- API keys are server-only environment variables.
- Real secrets must never be committed; only `.env.example` is tracked.
- Run `npm run security:secrets` before pushing to GitHub.
- Enable or expect GitHub Secret Protection and secret scanning.
- Passwords are hashed with bcrypt.
- Expensive routes use basic rate limiting.
- Kurioticket does not store card numbers or passport data.
- Kurioticket does not scrape airline websites or auto-fill airline websites.
- Revalidate authorization in server routes and components, not only via route interception.

See [docs/launch-security-checklist.md](docs/launch-security-checklist.md) before public launch.

## Legal Note

Legal documents are startup placeholders written for Kurioticket’s free metasearch, affiliate redirects, premium subscription, Stripe, Resend, OpenAI, travel API, and external-provider model. They should be reviewed by qualified legal counsel before large-scale public launch.

## Roadmap

Phase 1: public launch MVP, provider-backed search, auth, dashboards, premium subscription foundation, alerts, support, legal, admin foundations, Render readiness.

Phase 2: deeper AI optimization, personalization, trip management, analytics, destination and route intelligence.

Phase 3: autonomous travel companion, live monitoring, predictive intelligence, mobile ecosystem, travel autopilot.
