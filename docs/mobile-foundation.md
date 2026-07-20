# Kurioticket Mobile Foundation

## Purpose

Build a production-ready iOS and Android application without duplicating the existing Kurioticket backend, database, provider integrations, or business rules.

## Architecture decision

- Mobile framework: Expo React Native with TypeScript
- Navigation: Expo Router
- Backend: existing Next.js application and PostgreSQL database
- Mobile API boundary: `/api/mobile/v1`
- Staging backend: the Render service deployed from `dev`
- Production backend: the Render service deployed from `main`
- Mobile releases: Expo Application Services (EAS)

## Cost principles

1. Reuse the existing backend and database.
2. Keep one cross-platform mobile codebase.
3. Use free tiers during development where they do not reduce reliability.
4. Upgrade production services only before external beta or public launch.
5. Avoid microservices, a second database, and unnecessary native modules.

## Version 1 scope

- Onboarding
- Email/password authentication
- Google authentication
- Flight search and normalized results
- Safe external booking redirects
- Saved flights and searches
- Saved trips
- Price alerts
- Profile and preferences
- In-app and push notifications
- Premium subscription access

Hotel and car search remain feature-flagged until approved live providers are configured.

## Delivery stages

### Stage 1: Connectivity foundation

- Add the versioned mobile API namespace.
- Add a safe health endpoint.
- Initialize the Expo app.
- Configure development, staging, and production environments.
- Prove iOS and Android can reach the staging API.

### Stage 2: Mobile authentication

- Add short-lived mobile access tokens.
- Add rotated refresh tokens and revocation.
- Store credentials in Expo SecureStore.
- Support native Google OAuth redirects.
- Reuse existing verification, account-status, and rate-limit logic.

### Stage 3: Core travel experience

- Flight search
- Result details
- External provider redirects
- Saved items and trips
- Price alerts

### Stage 4: Native capabilities

- Push notifications
- Deep links
- Biometric app unlock
- Offline caching
- Crash reporting and analytics

### Stage 5: Release readiness

- Automated tests and CI
- Staging builds
- TestFlight and Google Play internal testing
- Security and privacy review
- Production infrastructure upgrade
- Store submission

## Environment policy

The mobile app must never embed provider, database, Stripe secret, Resend, OpenAI, or authentication secrets. Only public application configuration may be included in a mobile build.

Suggested application identifiers:

- Development: `com.kurioticket.mobile.dev`
- Staging: `com.kurioticket.mobile.staging`
- Production: `com.kurioticket.mobile`

## First acceptance test

A development build on both iOS and Android must call `GET /api/mobile/v1/health`, show the active environment and API version, handle offline/error states, and expose no server secrets.
