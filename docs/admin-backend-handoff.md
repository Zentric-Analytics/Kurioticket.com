# Admin backend handoff contract

This phase is backend-only. Existing admin pages are intentionally unchanged.

## Canonical overview

`GET /api/admin/overview` returns one backend-defined summary for a bounded date/environment scope:

- account totals by lifecycle state;
- support queue totals;
- account-deletion lifecycle totals;
- the existing consented journey summary, including stage and exact/legacy handoff semantics;
- real provider operational health from provider-call logs;
- admin action count inside the selected window.

The frontend must display these values as supplied. It should not invent conversion denominators or infer booking completion from provider handoffs.

## Provider operational health

`/api/admin/providers` and `/api/admin/provider-health` expose both:

- `integrations`: configuration/readiness (is the provider allowed to run?);
- `operational`: observed recent behavior from `ApiProviderLog` (has it actually been working recently?).

No health probe or paid provider request is made by these reads. The default observation window is 24 hours and is isolated to the current public environment.

Operational states:

- `NOT_READY`: readiness is not READY;
- `NO_RECENT_ACTIVITY`: ready but no provider calls were recorded;
- `HEALTHY`: recent calls have no failures/degraded results;
- `DEGRADED`: recent traffic includes failures/degraded results but also successful calls;
- `FAILING`: failures exist with no successful calls.

## Audit logs

`GET /api/admin/logs` now returns a safe DTO with opaque cursor pagination rather than raw Prisma rows. Filters are bounded to 90 days and include action, admin email, target type, target email, and date range.

The response deliberately omits raw metadata, IP addresses, and user-agent strings.
