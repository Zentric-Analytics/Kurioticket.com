# Admin operational read contracts

These backend-only APIs replace fixed direct-database reads for the future admin frontend. Existing admin pages are intentionally unchanged.

## Shared rules

- Every read repeats the existing canonical ADMIN authorization check before validation or storage access.
- Successful reads use `{ status: "ok", data: ... }`; invalid filters return 400, forbidden reads 403, missing detail rows 404, and unavailable storage 503.
- Responses are `private, no-store` and vary by Cookie and Authorization.
- List endpoints use opaque keyset cursors and a limit of 1-100 (default 50). Cursor reuse with changed filters is rejected.
- Optional `from` is inclusive and `to` is exclusive. Both require an ISO timestamp with an explicit timezone.
- Search and handoff reads default to the current public environment and exclude records tagged for another environment.
- No endpoint exposes raw search JSON, raw support source-context objects, visitor tokens/hashes, handoff keys, or full provider destination URLs.

## Endpoints

| Method | Path | Filters |
| --- | --- | --- |
| GET | `/api/admin/searches` | environment, product, status, identity, userId, visitorId, provider, from, to, limit, cursor |
| GET | `/api/admin/searches/[id]` | environment |
| GET | `/api/admin/provider-handoffs` | environment, product, identity, userId, visitorId, provider, correlation, from, to, limit, cursor |
| GET | `/api/admin/provider-handoffs/[id]` | environment |
| GET | `/api/admin/support` | status, priority, category, q, from, to, limit, cursor |
| GET | `/api/admin/support/[id]` | none; POST/PATCH mutations are unchanged |
| GET | `/api/admin/account-deletions` | status, q, from, to, limit, cursor |
| GET | `/api/admin/account-deletions/[id]` | existing detail contract; mutations are unchanged |

### Identity filters

`all` is the default. `registered` requires a user id, `guest` requires a visitor id without a user id, and `unattributed` has neither. Exact user/visitor filters can be added where compatible.

### Search DTO

Search reads expose only explicit search columns, identity ids, bounded provider names observed on journey events, market/currency summaries, outcome, latency, environment and timestamps. Raw `SearchHistory.query` is never returned.

### Provider handoff DTO

Handoffs expose provider/product, route, price/currency, a bounded safe source path, provider destination hostname, identity ids, environment and whether an exact originating search id was recorded. The destination URL and its query/fragment are never returned.

### Support DTO

The list exposes ticket metadata and message count. Detail exposes messages and only the allowlisted source-context keys `page`, `platform`, `source` and `action`. Account-deletion tickets may include the linked deletion request id.

### Account deletion DTO

The queue exposes lifecycle dates/status, account role/status, support/admin references and whether review notes exist. It deliberately does not put the user's reason, cancellation metadata or review-note contents in list rows; the existing detail endpoint remains the place for reviewed request details.
