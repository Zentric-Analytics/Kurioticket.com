# Kurioticket Mobile API v1 Plan

## Purpose of `/api/mobile/v1`

`/api/mobile/v1` is the planned API boundary for the iOS and Android mobile apps. It gives the mobile client stable, mobile-friendly endpoints while keeping server-only logic inside the existing Next.js backend.

The mobile app should call these endpoints over HTTPS. It should not import backend code directly or communicate directly with Prisma, PostgreSQL, provider SDKs, Stripe, Resend, OpenAI, or other secret-bearing services.

This is a planning document. The endpoint map below is proposed and should be implemented incrementally after approval, not all at once.

## API versioning and backward compatibility

- The first mobile API version is `/api/mobile/v1`.
- Versioned URLs should remain stable for released mobile app versions.
- Breaking response or request changes should require a new version, such as `/api/mobile/v2`.
- Additive changes are preferred. Adding optional fields is usually acceptable when older clients can safely ignore them.
- Stable machine-readable error codes should not be renamed after release.
- Deprecated fields or endpoints should remain available long enough for users to upgrade their installed apps.
- Mobile clients should send an app version and platform identifier when approved so the server can make safe compatibility decisions.

## Standard success response

Where a wrapper is helpful, mobile endpoints should use a consistent success envelope:

```json
{
  "data": {},
  "meta": {}
}
```

`data` contains the primary response body. `meta` is optional and can hold pagination, request, or compatibility information. Some simple endpoints, such as health checks, may return a smaller direct response if that is documented for the endpoint.

## Standard error response

Mobile endpoints should use safe, consistent errors:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "retryAfterSeconds": 60
  }
}
```

Required fields:

- `error.code`: a stable machine-readable code that the app can use for UI decisions.
- `error.message`: a safe user-facing message that does not reveal sensitive internals.

Optional fields:

- `error.retryAfterSeconds`: included only when the client should wait before retrying, such as after rate limiting or temporary service unavailability.

Internal stack traces, provider diagnostics, SQL details, tokens, secrets, and raw provider payloads must not be returned to the mobile client.

## Authentication design

Mobile authentication should be API-based and separate from the existing web session mechanism. Existing NextAuth web authentication remains unchanged.

Planned mobile authentication model:

- Users sign in with email and password through an approved mobile login endpoint.
- The server returns a short-lived bearer access token and an opaque refresh token.
- The access token is used in the `Authorization: Bearer <token>` header for authenticated mobile API calls.
- The refresh token is stored only as a hash on the server. Plain refresh tokens must never be stored server-side.
- Refresh tokens rotate. When a refresh token is used successfully, the server should issue a replacement token and revoke or invalidate the previous one.
- Refresh-token reuse should be treated as suspicious and may revoke the affected device session.
- Users can revoke one device session with logout or all device sessions with logout-all.
- The mobile app should store tokens using Expo SecureStore after Expo is approved and added.
- Device sessions should track useful metadata such as platform, app version, creation time, last-used time, and revocation time.
- Account suspension, account deletion, and disabled users must prevent token refresh and authenticated access.
- Email verification and password reset should reuse existing verification and password-reset logic where appropriate instead of creating separate account rules for mobile.
- Password reset should revoke affected sessions when that is required by the approved security policy.

## Likely future database additions

These are likely database needs, but no migrations should be created until owner approval:

- `MobileSession` or an equivalent table for hashed refresh tokens, device sessions, rotation, expiry, and revocation.
- `PushDevice` for platform push tokens after push notifications are approved.
- Optional `NotificationDelivery` records for delivery state, read state, and channel history.
- A `PUSH` notification channel after push infrastructure is approved.
- Optional client platform metadata for analytics, compatibility, and support diagnostics.

## Proposed endpoint map

This map is a proposed implementation plan. It does not mean every endpoint should be built at once.

### Foundation

- `GET /api/mobile/v1/health`
- `GET /api/mobile/v1/config`

### Authentication

- `POST /api/mobile/v1/auth/login`
- `POST /api/mobile/v1/auth/refresh`
- `POST /api/mobile/v1/auth/logout`
- `POST /api/mobile/v1/auth/logout-all`
- `GET /api/mobile/v1/auth/me`
- `POST /api/mobile/v1/auth/password/forgot`
- `POST /api/mobile/v1/auth/password/reset`
- `POST /api/mobile/v1/auth/email/verify`
- `POST /api/mobile/v1/auth/email/resend`

### Flights

- `POST /api/mobile/v1/flights/search`
- `GET /api/mobile/v1/flights/details`
- `POST /api/mobile/v1/redirects`

### Account

- `GET /api/mobile/v1/account/profile`
- `PATCH /api/mobile/v1/account/profile`
- `GET /api/mobile/v1/account/preferences`
- `PATCH /api/mobile/v1/account/preferences`

### Saved data

- `GET /api/mobile/v1/saved`
- `POST /api/mobile/v1/saved`
- `DELETE /api/mobile/v1/saved/:id`
- `GET /api/mobile/v1/trips`
- `POST /api/mobile/v1/trips`
- `PATCH /api/mobile/v1/trips/:id`
- `DELETE /api/mobile/v1/trips/:id`

### Price alerts

- `GET /api/mobile/v1/price-alerts`
- `POST /api/mobile/v1/price-alerts`
- `PATCH /api/mobile/v1/price-alerts/:id`
- `DELETE /api/mobile/v1/price-alerts/:id`

### Notifications

- `GET /api/mobile/v1/notifications`
- `PATCH /api/mobile/v1/notifications/:id/read`

### Support

- `POST /api/mobile/v1/support/tickets`
- `GET /api/mobile/v1/support/tickets`

## Feature flags

The following areas should have explicit feature flags or remain postponed until approved:

- hotels
- cars
- push notifications
- route watch
- social authentication
- premium subscriptions

Feature flags should be controlled by the backend or approved configuration. A hidden mobile screen is not enough protection for unfinished server behavior.

## Security requirements

- No secrets may be shipped in the mobile binary.
- Bearer tokens must be validated on protected endpoints.
- Authorization must check resource ownership, not only authentication.
- Error responses must be safe and consistent.
- Raw provider payloads must not be returned directly to the mobile app.
- Sensitive internal diagnostics must not be exposed to clients.
- Rate limiting should protect login, refresh, password reset, email verification, search, support, and redirect endpoints.
- Redirect URLs must be validated server-side before the app opens external booking links.
- Token revocation must work for logout, logout-all, password reset, suspicious refresh-token reuse, account suspension, and account deletion.
- Privacy and analytics collection must follow consent requirements and platform policies.

## Owner approval gates

Explicit owner approval is required before:

- adding Expo dependencies
- creating mobile authentication code
- creating Prisma migrations
- adding Google or Apple authentication
- adding push notifications
- adding payments or subscriptions
- upgrading paid infrastructure
- merging into `dev`
- promoting to `main`

These gates keep planning separate from implementation and protect the existing web application, staging environment, and production environment from accidental changes.
