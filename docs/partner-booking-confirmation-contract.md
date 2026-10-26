# Partner booking confirmation contract

Kurioticket is a metasearch and referral platform. A provider handoff is not a booking confirmation. A trip enters **My Trips** only when an approved external travel provider sends a signed confirmation to the server-to-server endpoint below.

This endpoint is dormant until a provider agreement supports an external booking handoff, the expected provider name is configured, and a private webhook secret has been configured. The current Duffel search integration and KAYAK sandbox integration do **not** meet that requirement and do not send confirmations.

## Endpoint and authentication

`POST /api/internal/partner-confirmations`

Set `PARTNER_CONFIRMATION_PROVIDER_NAME` to the exact contractually approved provider name, and `PARTNER_CONFIRMATION_WEBHOOK_SECRET` to a randomly generated provider-specific secret of at least 32 characters. Both must be set or the endpoint returns `503`. One configured provider and its secret are supported per deployment; there is no shared multi-provider fallback. It is server-only and must never be exposed to a browser, mobile app, or `NEXT_PUBLIC_` variable.

The provider sends the raw JSON body with these headers:

| Header | Value |
| --- | --- |
| `x-kt-confirmation-timestamp` | Unix timestamp in seconds, within five minutes of the request. |
| `x-kt-confirmation-signature` | `sha256=<hex HMAC-SHA256(timestamp + "." + raw request body)>` using the configured secret. |

After signature verification, the signed `providerName` must match `PARTNER_CONFIRMATION_PROVIDER_NAME` exactly. A mismatch returns `403` and cannot create a My Trip. The signature envelope is checked before the body is read. The endpoint streams and bounds bodies to 64 KiB, returning `413` rather than buffering an oversized request. It returns `401` for missing, stale, or invalid signatures and `503` until a sufficiently strong secret is configured.

## Signed JSON payload

```json
{
  "customer": { "userId": "kurioticket-account-id" },
  "occurredAt": "2026-10-22T15:29:00.000Z",
  "partnerConversionId": "provider-idempotency-key",
  "providerName": "Approved Provider",
  "providerConfirmationCode": "ABC-123",
  "providerTripId": "optional-provider-trip-id",
  "providerManageUrl": "https://provider.example/manage/ABC-123",
  "tripType": "flight",
  "status": "upcoming",
  "origin": "LOS",
  "destination": "LHR",
  "departureAt": "2026-11-01T09:00:00.000Z",
  "returnAt": "2026-11-12T11:00:00.000Z",
  "travelerCount": 2,
  "currency": "USD",
  "totalAmount": 425.5
}
```

`customer.userId` must be the opaque Kurioticket account reference agreed in the private partner integration; do not send an email address. `occurredAt` is the provider event's UTC occurrence time, must be a valid ISO timestamp, and may be at most five minutes ahead of Kurioticket server time so a bad provider clock cannot poison canonical update ordering. `partnerConversionId` is idempotent per provider. Repeating a confirmation with a newer `occurredAt` updates the canonical trip; an equal or older event is acknowledged without overwriting newer state. Reusing the conversion identifier for another user fails with `409` and does not modify the original trip.

The endpoint acknowledges only `{ "accepted": true, "tripId": "…" }`. It does not return trip, traveler, or payment details to the provider. Invalid payloads, unsafe provider manage URLs, and impossible travel dates are rejected. A successful callback creates or updates a provider-confirmed **My Trip**; it never creates a Kurioticket booking or payment record.


## Authenticated receipt monitoring (Phase 2)

Successful and rejected **authenticated** callback deliveries are recorded in the
`PartnerConfirmationDelivery` table. Receipts contain configured provider name,
delivery outcome, limited reason, event occurrence time, reported trip status,
and, for accepted requests only, a canonical My Trip ID. They do not store
raw JSON, customer identifiers, provider confirmation numbers, signature
headers, or payment data. Unauthenticated requests are rejected without
inserting a receipt.

- `ACCEPTED` means the authenticated request was accepted by ingestion. It may
  represent an idempotent retry, **not a new booking** or a changed trip.
- `REJECTED` covers authenticated payload validation, provider mismatch,
  ownership mismatch, or an ingestion failure.
- Successful canonical ingestion must also persist an accepted delivery
  receipt before responding with `200`. If receipt persistence fails after the
  canonical upsert, the endpoint responds with retryable `503`; the existing
  idempotent conversion ID makes a retry safe and avoids a second My Trip.
  Rejected-request receipt writes are best-effort, and missing telemetry is
  never presented as a genuine zero count.
- The latest 50 receipts linked to a trip appear in the read-only admin trip
  details. This is callback history, not an authoritative history of every
  provider booking change; rejected untrusted callbacks are not linked to a
  particular customer.
- Admin Overview shows recent authenticated receipt counts and an explicit
  no-feed / telemetry-unavailable state. Configuring an integration does not
  prove the external provider is actually sending confirmations.
- Existing Notifications & Alerts warn about authenticated rejection activity
  or unreadable delivery telemetry **only** when a provider-bound feed is
  configured. Zero callbacks alone do not trigger an alert because no expected
  delivery cadence has been established.

## Safe activation

1. Apply the database migration before deploying the new code.
2. Establish an approved provider contract and coordinate its opaque user-ID
   mapping without exposing account identity in webhook logs.
3. Configure the matching provider name and provider-specific secret in server
   environment settings only. Do not put either value in client bundles.
4. Test invalid signatures, wrong provider, malformed bodies, retries,
   out-of-order updates and customer ownership conflicts in isolated staging.
5. Verify that receipts and monitoring are visible and that accepted My Trips
   are only genuine signed confirmations.
6. Activate a live feed only after a verified end-to-end integration.
