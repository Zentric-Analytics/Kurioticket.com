# Kurioticket Mobile Foundation

## Purpose

Kurioticket will add a mobile app for iOS and Android while keeping the current website and backend stable. The mobile app should reuse the existing Next.js backend, PostgreSQL database, Prisma models, provider integrations, and applicable business logic instead of creating a second backend.

This document is a planning document only. It does not approve implementation work by itself.

## Approved mobile direction

- **Mobile technology:** React Native with Expo and TypeScript.
- **Repository strategy:** a gradual monorepo inside this existing repository.
- **Current web application:** the existing Next.js application structure stays intact for now. It should not be moved into `apps/web` during the current planning stage.
- **Mobile API namespace:** mobile-specific APIs should live under `/api/mobile/v1`.
- **Backend reuse:** the mobile app should call approved API endpoints in the existing Next.js backend and must not bypass the backend to reach providers, Prisma, or secrets directly.

## Gradual monorepo approach

The repository can become a monorepo gradually without disrupting the working web application.

For now:

1. Keep the existing Next.js app where it is.
2. Keep shared planning documents under `docs/`.
3. Add mobile workspace structure only after owner approval.
4. Do not scaffold Expo until the mobile API plan and mobile authentication plan are approved.
5. Do not move the web app into `apps/web` during this task.

Later, after approval, the repository may add a mobile app folder such as `apps/mobile` and shared package folders only when there is a clear need. Any shared package must be safe for mobile use and must not expose server-only modules or secrets.

## Version 1 scope

Version 1 should be deliberately small enough to build, test, and operate safely.

Approved Version 1 mobile scope:

- onboarding and app shell
- email/password login
- email verification
- password reset
- real provider-backed flight search
- flight results and flight details
- secure external booking redirects
- saved flights and saved searches
- saved trips
- profile and core preferences
- price alerts using email and in-app delivery initially
- support ticket creation
- basic in-app notification list

Version 1 does **not** include premium subscription access, native payments, hotels, cars, push notifications, admin tools, or direct AI calls from the mobile client.

## Postponed or feature-flagged features

These features should remain postponed or behind feature flags until separately approved:

- hotels, until approved real live inventory is confirmed
- cars, until a complete real provider-backed flow is confirmed
- push notifications, until device-token infrastructure is implemented
- route watch
- social authentication, including Google and Apple authentication
- premium subscriptions
- Stripe digital subscription checkout inside mobile
- native Apple or Google in-app purchases
- mobile passkeys
- advanced two-factor management
- offline mode beyond basic caching
- mobile admin functionality
- direct OpenAI calls from the mobile client

Social authentication needs special review. Google sign-in must not be included on iOS without an approved Apple Sign In implementation. Social authentication can be postponed until both platforms are planned correctly.

## What the mobile client may import

The mobile client may import mobile-safe code only, such as:

- TypeScript types that contain no server behavior
- validation schemas that do not import server modules
- presentation utilities that work in React Native
- constants that are safe to ship in a public mobile binary

The mobile client must treat the Next.js backend as a network API boundary.

## What the mobile client must not import

The mobile application must never directly import:

- Next.js route handlers or server components
- Prisma or the generated Prisma client
- NextAuth server configuration
- server environment helpers
- provider SDKs or provider secrets
- Stripe, Resend, OpenAI, or database secrets
- Node-only server modules

This keeps secrets out of the mobile binary and prevents mobile releases from depending on server-only runtime behavior.

## Existing web app and NextAuth remain intact

The existing web application remains the source of truth for current website behavior. The current NextAuth web authentication implementation remains unchanged unless a separate approved web-auth task changes it.

Mobile authentication should be planned as an API-based mobile session system that reuses existing account, email verification, password reset, account-status, and security logic where appropriate. It must not replace or break existing NextAuth web sessions.

## Environment definitions

### Development

Development is for local engineering work and early device testing. It may point to a local backend or an approved development backend. Development builds may use development bundle identifiers and non-production API base URLs.

### Internal preview

Internal preview is for owner and team review before broader testing. It should use controlled builds and non-production configuration. Internal preview should verify that the app shell, API connectivity, authentication flows, and core screens behave correctly before staging is used for larger testing.

### Staging

Staging is the main pre-production environment for realistic testing. Existing free staging infrastructure may be used during planning and early internal development. Staging should use staging API URLs, staging secrets on the server, and staging data policies.

### Production

Production is for public users. Production web service and PostgreSQL infrastructure should be upgraded to always-on paid infrastructure before external beta. Production mobile builds must use production API URLs and must not include server secrets.

## Owner approval checkpoints

Explicit owner approval is required before:

- adding Expo dependencies
- initializing or scaffolding Expo
- creating mobile authentication code
- creating Prisma migrations
- adding Google or Apple authentication
- adding push notifications
- adding payments or subscriptions
- upgrading paid infrastructure
- merging mobile architecture work into `dev`
- promoting mobile work to `main`

These checkpoints are intended to avoid accidental cost increases, irreversible schema changes, authentication regressions, or app-store policy issues.

## Delivery stages

### Stage 1: Documentation and API planning

- Finalize the mobile foundation document.
- Finalize the `/api/mobile/v1` plan.
- Confirm authentication and session design.
- Confirm feature flags and postponed features.
- Do not scaffold Expo in this stage.

### Stage 2: API and authentication approval

- Review mobile authentication design.
- Review database additions that may be needed later.
- Review rate limits, token revocation, and account deletion behavior.
- Approve or revise the first implementation slice.

### Stage 3: Mobile app foundation

Only after approval:

- Add Expo and TypeScript mobile dependencies.
- Create the mobile workspace.
- Configure development, internal preview, staging, and production app environments.
- Prove iOS and Android can call approved `/api/mobile/v1` endpoints.

### Stage 4: Version 1 implementation

Build Version 1 incrementally, starting with authentication and the flight experience before saved data, alerts, notifications, and support.

### Stage 5: Release readiness

- Automated checks and release candidate builds
- TestFlight and Google Play internal testing
- Security and privacy review
- Production infrastructure upgrade before external beta
- Store submission only after owner approval

## Cost and safety principles

1. Reuse the existing backend and database.
2. Keep one cross-platform mobile codebase.
3. Use free tiers during development where they do not reduce reliability.
4. Upgrade production services before external beta or public launch.
5. Avoid microservices, a second database, and unnecessary native modules unless clearly approved.
6. Keep secrets and provider integrations on the server.
