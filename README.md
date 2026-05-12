# Curioticket

Curioticket is an Intelligent Stress-Free Travel Confidence Platform. Phase 1 focuses on free flight and hotel search, normalized provider results, partner redirects, account dashboards, price alerts, premium subscription plumbing, support, legal pages, admin foundations, and Render deployment readiness.

Curioticket is not an airline and does not issue tickets at launch. Users complete final booking and payment with airlines, hotels, or trusted booking partners.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- PostgreSQL with Prisma
- NextAuth credentials and Google auth
- Amadeus, Duffel, Kiwi/Tequila, and hotel provider service architecture
- Stripe Checkout, subscriptions, webhooks, billing portal
- Resend transactional email
- OpenAI API for premium travel intelligence
- Render Blueprint deployment

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
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
- `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`
- `DUFFEL_API_KEY`
- `KIWI_API_KEY`, `TRAVELPAYOUTS_API_KEY`
- `HOTEL_API_KEY`
- `ADMIN_EMAILS`

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

The schema includes users, auth sessions, subscriptions, saved flights/hotels/searches, search history, price alerts, support tickets, redirect logs, provider logs, notifications, preferences, trips, legal documents, feature flags, analytics, and provider health logs.

## Travel Provider Setup

Provider calls happen only in backend services under `src/services/travel`.

- Amadeus is the primary flight provider.
- Duffel is the secondary flight provider.
- Kiwi/Tequila is the third flight provider.
- Hotels use Amadeus Hotels when Amadeus credentials exist, then a hotel partner/Travelpayouts-style fallback if configured.

If provider credentials are missing, unavailable, or rate-limited in local development, the aggregator returns clearly labeled development fallback results. In production, Curioticket does not pretend fallback data is live data; the search API returns a professional live-provider unavailable message instead. Raw provider responses are never returned to users.

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

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Use a verified sender domain before production email traffic. Resend is used for support confirmations and future price alert emails.

## OpenAI Setup

Set `OPENAI_API_KEY`. Premium AI routes use provider/search data as truth and are instructed not to invent prices, availability, baggage rules, policies, or guaranteed savings.

## Render Deployment

This repository includes `render.yaml` for a Render Blueprint:

- Node web service
- Render PostgreSQL database
- `/api/health` health check
- production env var placeholders with secrets marked `sync: false`

Recommended deployment flow:

```bash
git add .
git commit -m "Build Curioticket Phase 1 MVP"
git push origin main
```

Then open:

```text
https://dashboard.render.com/blueprint/new
```

Select the GitHub repository, fill secret environment variables, apply the Blueprint, and run `npm run db:deploy` after migrations exist.

Production keys must be added in Render environment variables only. Local keys belong in `.env.local`, which is ignored by git.

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
- Curioticket does not store card numbers or passport data.
- Curioticket does not scrape airline websites or auto-fill airline websites.
- Revalidate authorization in server routes and components, not only via route interception.

See [docs/launch-security-checklist.md](docs/launch-security-checklist.md) before public launch.

## Legal Note

Legal documents are startup placeholders written for Curioticket’s free search, affiliate redirect, premium subscription, Stripe, Resend, OpenAI, travel API, and no-ticket-issuing launch model. They should be reviewed by qualified legal counsel before large-scale public launch.

## Roadmap

Phase 1: public launch MVP, provider-backed search, auth, dashboards, premium subscription foundation, alerts, support, legal, admin foundations, Render readiness.

Phase 2: deeper AI optimization, personalization, trip management, analytics, destination and route intelligence.

Phase 3: autonomous travel companion, live monitoring, predictive intelligence, mobile ecosystem, travel autopilot.
