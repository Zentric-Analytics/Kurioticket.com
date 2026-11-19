# Partner flight status contract

Kurioticket does not infer operational flight status from a search, a provider handoff, or a booking confirmation. A real-time status appears only after an approved provider sends a signed server-to-server event for an existing provider-confirmed flight trip.

The current Duffel search integration and KAYAK sandbox do not supply this feed. Until an approved provider is configured, no flight is shown as live-tracked.

## Status update endpoint

`POST /api/internal/flight-status/updates`

Configure a server-only `FLIGHT_STATUS_PROVIDER_NAME` and a separate `FLIGHT_STATUS_WEBHOOK_SECRET` with at least 32 random characters. The configured provider name must exactly match `providerName` in every accepted payload. This credential is therefore bound to one approved provider; onboard another provider with a separate credential boundary rather than sharing this secret. The sender signs the exact raw JSON body using HMAC-SHA256:

| Header | Value |
| --- | --- |
| `x-kt-flight-status-timestamp` | Unix timestamp in seconds, no more than five minutes old. |
| `x-kt-flight-status-signature` | `sha256=<hex HMAC-SHA256(timestamp + "." + raw request body)>` using `FLIGHT_STATUS_WEBHOOK_SECRET`. |

The route checks the envelope before reading the body, streams bodies with a 64 KiB maximum, and returns `413` rather than buffering an oversized request. It returns only `{ "accepted": true, "applied": true|false }`; it never exposes a traveller, account, confirmation code, or trip identifier to the provider.

## Signed payload

```json
{
  "providerName": "Approved Provider",
  "partnerConversionId": "provider-idempotency-key",
  "occurredAt": "2026-10-22T15:59:00.000Z",
  "status": "delayed",
  "carrierCode": "AA",
  "flightNumber": "123",
  "originAirport": "LOS",
  "destinationAirport": "LHR",
  "scheduledDepartureAt": "2026-11-01T09:00:00.000Z",
  "scheduledArrivalAt": "2026-11-01T15:00:00.000Z",
  "estimatedDepartureAt": "2026-11-01T09:45:00.000Z",
  "actualDepartureAt": null,
  "estimatedArrivalAt": "2026-11-01T15:45:00.000Z",
  "actualArrivalAt": null
}
```

Allowed statuses are `scheduled`, `delayed`, `departed`, `arrived`, `cancelled`, and `unknown`. Times must be valid UTC ISO timestamps. The provider and conversion key must already identify a provider-confirmed `FLIGHT` My Trip. An unrecognised or non-flight trip is acknowledged with `applied: false`.

`occurredAt` is the ordering value. It may be at most five minutes ahead of Kurioticket server time. Events farther in the future are rejected so a bad provider clock cannot poison ordering. A status event only replaces a stored snapshot when it is newer; equal or older retries are acknowledged with `applied: false` and cannot restore stale information.

## Customer read endpoints

`GET /api/dashboard/trips/:id/flight-status` requires the canonical signed-in web session. `GET /api/mobile/v1/trips/:id/flight-status` requires the canonical mobile bearer session. Both only return the owner’s flight trip. Before a provider update exists, it returns `dataAvailable: false`; a frontend must not convert that into “on time,” “cancelled,” or another operational claim. Once present, a snapshot includes its safe flight identifiers, operational status, scheduled/estimated/actual timestamps, and a `current` or `stale` freshness indicator.


## Current snapshot scope

The schema intentionally stores one operational snapshot per `MyTrip`. In this first version that means the provider must send the primary flight segment only. Return legs and connecting segments are not represented as independent live-status records yet; segment-level tracking requires a future segment model rather than overwriting multiple legs into this snapshot.
