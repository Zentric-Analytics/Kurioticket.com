# Partner booking confirmation contract

Kurioticket is a metasearch and referral platform. A provider handoff is not a booking confirmation. A trip enters **My Trips** only when an approved external travel provider sends a signed confirmation to the server-to-server endpoint below.

This endpoint is dormant until a provider agreement supports an external booking handoff and a private webhook secret has been configured. The current Duffel search integration and KAYAK sandbox integration do **not** meet that requirement and do not send confirmations.

## Endpoint and authentication

`POST /api/internal/partner-confirmations`

Set `PARTNER_CONFIRMATION_WEBHOOK_SECRET` to a randomly generated secret of at least 32 characters. It is server-only and must never be exposed to a browser, mobile app, or `NEXT_PUBLIC_` variable.

The provider sends the raw JSON body with these headers:

| Header | Value |
| --- | --- |
| `x-kt-confirmation-timestamp` | Unix timestamp in seconds, within five minutes of the request. |
| `x-kt-confirmation-signature` | `sha256=<hex HMAC-SHA256(timestamp + "." + raw request body)>` using the configured secret. |

The signature is checked before JSON is parsed. The endpoint accepts bodies of at most 64 KiB and returns `401` for missing, stale, or invalid signatures. It returns `503` until a sufficiently strong secret is configured.

## Signed JSON payload

```json
{
  "customer": { "userId": "kurioticket-account-id" },
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

`customer.userId` must be the opaque Kurioticket account reference agreed in the private partner integration; do not send an email address. `partnerConversionId` is idempotent per provider. Repeating the same confirmation for the same user updates the canonical trip. Reusing it for another user fails with `409` and does not modify the original trip.

The endpoint acknowledges only `{ "accepted": true, "tripId": "…" }`. It does not return trip, traveler, or payment details to the provider. Invalid payloads, unsafe provider manage URLs, and impossible travel dates are rejected. A successful callback creates or updates a provider-confirmed **My Trip**; it never creates a Kurioticket booking or payment record.
