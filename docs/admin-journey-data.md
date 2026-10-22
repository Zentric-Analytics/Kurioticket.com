# Admin journey data contract

This is the read contract for the consented search journey recorded by the website and native applications. It supplies data to a future admin journey interface without changing existing admin pages or account controls.

## Entry points and authorization

Server Components and other server code should import the production service:

```ts
import { adminJourneys } from "@/services/adminJourneyService";

const result = await adminJourneys.list({ product: "FLIGHT", limit: "25" });
// Also: adminJourneys.detail(journeyId, params), adminJourneys.summary(params).
```

The production module is `server-only`. Every method calls the existing `requireAdminApiSession` guard before validating filters or requesting a database connection. The guard requires a current canonical account session, the configured `ADMIN` role/email, active account status, and verified email. Existing two-factor and account-session checks continue to apply. `SUPPORT` navigation visibility does not grant access to these readers.

Small GET adapters expose the same contract for client-rendered admin controls:

| Method | Path | Service |
| --- | --- | --- |
| GET | `/api/admin/journeys` | `list` |
| GET | `/api/admin/journeys/[id]` | `detail` |
| GET | `/api/admin/journeys/summary` | `summary` |

All responses use `Cache-Control: private, no-store` and `Vary: Cookie, Authorization`. Server Components should call the service directly; they do not need to make an internal HTTP request. The injectable factory in `adminJourneyCore.ts` is for server integration and tests; application callers must use the production service with its real authorization dependency.

## Result states

Every method returns a discriminated union. HTTP adapters preserve that body:

| Body | HTTP status | Meaning |
| --- | --- | --- |
| `{ status: "ok", data: ... }` | 200 | A successful read; lists may be empty and counts may be zero. |
| `{ status: "invalid", issues: [{ field, message }] }` | 400 | A malformed ID, filter, date window, or cursor. |
| `{ status: "forbidden" }` | 403 | The caller does not meet the existing admin guard. |
| `{ status: "not_found" }` | 404 | A detail record has no eligible events in the requested cohort. This does not disclose whether an excluded record exists. |
| `{ status: "unavailable" }` | 503 | Storage, authorization infrastructure, or the bounded read failed. There is no partial data or invented zero count. |

The UI must render `unavailable` separately from `ok` with an empty list. Raw database errors, credentials, and SQL are never included in responses.

## Query parameters

Parameters are strings both in the URL and when passing a plain object to the service. Unknown parameters, repeated URL keys, arrays, malformed enums, and out-of-range values are rejected. IDs accept 6–80 ASCII letters, digits, underscores, or hyphens.

| Parameter | Values / limit | Default |
| --- | --- | --- |
| `from` | ISO timestamp with `Z` or an explicit numeric offset; inclusive | Seven days before `to` |
| `to` | ISO timestamp with `Z` or an explicit numeric offset; exclusive; cannot be in the future | Server time at the first request |
| `environment` | `staging` or `production`; no mixed or unknown-environment option | `getPublicEnvironment()` from existing staging-safety configuration |
| `identity` | `all`, `guest`, or `registered` | `all` |
| `visitorId` | Exact consenting visitor ID | Unfiltered |
| `userId` | Exact current linked account ID; incompatible with `identity=guest` | Unfiltered |
| `product` | `FLIGHT`, `HOTEL`, `CAR`, or `PACKAGE` | Unfiltered |
| `provider` | Exact case-sensitive name, 1–100 characters, no surrounding whitespace or control characters | Unfiltered |
| `stage` | `SEARCH_COMPLETED`, `RESULTS_VIEWED`, `OFFER_SELECTED`, or `PROVIDER_HANDOFF_STARTED` | Unfiltered |
| `limit` | Integer 1–100, list/detail only | List 25; detail 50 |
| `cursor` | Opaque returned continuation, list/detail only | First page |

The window must be nonempty and no longer than 90 days. Dates are normalized to UTC. The four product names are schema values, not a claim that every product currently emits all four journey stages.

### Cohort and event-window semantics

The window selects **event creation timestamps**, including events in journeys that started before `from`. All event timestamps and response timestamps are UTC. Each returned journey has at least one eligible event inside `[from, to)`.

Identity filters apply to the current consented visitor/account relationship. Product, provider, and stage filters choose journeys containing an eligible matching event in that window. Each filter is an independent presence condition: a `RESULTS_VIEWED` event need not itself carry the provider found on a later handoff. After a journey matches, its detail events and summary counts include **all eligible events for that journey in the same window**, including other searches or products. These are journey-cohort filters, not event-row filters.

The selected `environment` must match `JourneyEvent.metadata.environment`. Linked search rows must also match `SearchHistory.query.environment`. Existing writers add these tags using `withEnvironmentMetadata`. Unknown/unlabelled legacy events and searches are excluded from these read models. An explicit conflicting `RedirectLog.metadata.environment` also excludes the handoff. Older redirect rows lack that tag: they may appear only through an explicitly environment-tagged journey event whose visitor/account ownership checks pass. This compatibility exception does not infer search correlation. Explicitly selecting another environment never combines its records with the default environment.

### Cursor semantics

Lists sort by `(lastEventAt DESC, journeyId DESC)`. `lastEventAt` means the latest eligible event in the chosen window, not the raw mutable `SearchJourney.lastActivityAt`. Detail events sort by `(createdAt ASC, eventId ASC)`. The ID is the deterministic tie-breaker for equal timestamps.

The continuation contains the original window and filters, so `/api/admin/journeys?cursor=...` continues the same cohort even after the server clock advances. A caller may change the page size, but cannot change filters while reusing a cursor. Detail cursors are also bound to the journey ID; list/detail cursors cannot be interchanged. Use a new first-page request when changing filters.

Cursors are untrusted positions, not access credentials. The service revalidates the payload and repeats authorization, consent, ownership, and environment checks on every page. Consent withdrawal or account-status changes can therefore remove previously visible records from later pages. This is a privacy-aware live view, not a permanent historical snapshot. Corrections to current search outcome rows may also change later reads. The fixed upper date bound prevents ordinarily arriving new events from shifting a continuation window forward.

## Privacy and identity eligibility

Every listed visitor must have `consentStatus=GRANTED` and `trackingDisabledAt=null`. Retirement uses the existing withdrawal/disable fields; no new retirement field is required.

- A guest has no `currentUserId` and no `VisitorIdentityLink` rows.
- A registered identity has a current account with `status=ACTIVE` and a verified email, at least one matching identity link, and no link to a different account.
- A search attached to an event must belong to the same visitor and have either no explicit account attribution or attribution to that visitor's current account.
- A redirect attached to an event must meet the same visitor/account ownership rule. When an exact search link exists, both linked records must pass their own checks, their product must agree with the event, and `RedirectLog.metadata.requestId` must equal the linked search's non-null request ID. Inconsistent non-null links exclude the event instead of fabricating a relationship.
- Search-related stages require an existing owned `SearchHistory` row. A handoff stage requires an existing owned `RedirectLog` row. Missing, inconsistent, or mixed-owner references are excluded.
- Prior consented visitors retained during an ordinary account switch remain eligible under their original exclusive account. A rotated token by itself is not a reason to hide a valid historical account relationship.

The DTO exposes internal visitor/account IDs sufficient to link to the existing admin identity view. It does not expose visitor tokens, token hashes, account credentials, raw search JSON, raw analytics metadata, full destination URLs, URL query strings, or fragments. Search summaries use explicit columns. Provider destinations are reduced to a hostname, and source pages to a bounded path. Provider previews contain at most ten names; `providerCount` identifies whether more distinct names exist.

These readers do not revive withdrawn identity links. The operational all-search aggregate below can include unattributed or no-longer-consented searches, but contains only counts, not identity details.

## List and detail shapes

Type definitions live in `src/services/adminJourneyContract.ts` and can be imported with `import type` by UI code.

`list` returns:

```ts
{
  scope: AdminJourneyScope;
  items: Array<{
    id: string;
    identity: { kind: "guest" | "registered"; visitorId: string; userId: string | null };
    startedAt: string;   // Stored journey start, possibly before the requested window.
    firstEventAt: string;
    lastEventAt: string; // Eligible event bounds inside the window.
    products: AdminJourneyProduct[];
    providers: string[]; // Up to ten names.
    providerCount: number;
    eventCount: number;
    searchCount: number; // Distinct linked SearchHistory IDs.
    stages: Record<AdminJourneyStage, number>; // Raw event counts, not boolean progression.
  }>;
  nextCursor: string | null;
}
```

`detail` returns `{ scope, journey, events, nextCursor }`. The `journey` has the same list-row shape and covers the whole eligible window, independent of the current event page. Each event contains its ID, observed type, timestamp, product, provider, safe source path, optional safe search summary, and optional safe handoff summary.

Search summaries contain ID, request ID, product, origin/destination, check-in/out, current status/result count/latency. Handoff summaries contain redirect ID, provider, route, destination domain, and `searchCorrelation`:

- `exact`: an owned `searchHistoryId` is explicitly attached to this handoff event and its request ID agrees with the redirect's stored request ID.
- `unavailable`: the handoff is recorded for this journey, but its original search is not attached. This includes legacy handoffs. Do not assign it to the nearest search or offer by time.

No booking-success field is supplied. An offer selection or provider handoff is not proof of a completed booking, payment, or revenue.

## Summary definitions

`summary` returns the scope and the following independent measures:

| Field | Definition |
| --- | --- |
| `identities.total` | Distinct eligible `visitorId` values with an event in the matched cohort |
| `identities.guests` | Those visitor IDs with no current account |
| `identities.registered` | Those visitor IDs currently linked to an eligible registered account |
| `identities.registeredAccounts` | Distinct current account IDs across registered identities |
| `journeys` | Distinct matched journey IDs |
| `rawEvents` | Number of eligible persisted event rows in those journeys/window |
| `stages[type].identities` | Distinct visitor IDs with that observed event type |
| `stages[type].journeys` | Distinct journey IDs with that observed event type |
| `stages[type].events` | Raw number of eligible events of that type |
| `recordedSearches` | Distinct search-history IDs linked to eligible events, separated into current `success`, `partial`, and `failed` outcomes |
| `handoffCorrelation.exactEvents` | Handoff events with an explicit eligible search-history link |
| `handoffCorrelation.uncorrelatedEvents` | Handoff events without an exact search link |
| `operationalSearches` | All `SearchHistory` counts by outcome using search creation time and environment only; includes searches without consenting journey identities |

`operationalSearches.scope` is always `environment_and_date_only`: identity, provider, product, and stage cohort filters do not apply to that independent operational total. Its window uses `SearchHistory.createdAt`, while journey metrics use event creation time. It is not a denominator for consented journey conversion.

Visitor identities are browser/app identities, not unique human counts. Multiple consenting visitors can link to one account, and one visitor can have several journeys or searches. A real repeated selection is a separate event; transport retries use the same event identity and are deduplicated by the writer. Distinct-stage journey counts avoid interpreting multiple clicks as multiple converted journeys.

### Journey duration, order and incomplete observations

The writer groups events for a visitor using a 30-minute inactivity window. `SEARCH_COMPLETED` describes completion of the search attempt, including failed/no-result outcomes; inspect the search status. Progressive hotel results may be viewed or selected before the final `SEARCH_COMPLETED` event is stored. Network delays also affect event arrival order.

The read model reports observed stages and recorded timestamps. It does not require a strict search → results → selection → handoff sequence, does not invent missing events, and does not call missing later events abandonment. The four stage counts are not guaranteed to be monotonically decreasing. UI charts should label the selected cohort/window and the measured unit.

## Query bounds and verification

Each read uses a repeatable-read transaction, a four-second PostgreSQL statement timeout, a one-second connection/transaction wait limit, and a ten-second transaction deadline. Pagination is keyset-based; neither huge offsets nor unbounded event arrays are returned. A timeout returns `unavailable`. Performance/index requirements should be assessed on actual event volume before widening the 90-day limit.

Focused unit tests cover authorization before validation/storage, strict input and cursor binding, safe DTOs, exact/legacy handoff presentation, distinct count fields, unavailable/empty separation, and SQL parameterization. The isolated `scripts/admin-journey.integration.ts` suite exercises the actual PostgreSQL queries with:

1. Consented guest and exclusively linked active/verified account fixtures; multiple visitors for one account.
2. Withdrawn/retired visitors, disabled tracking, inactive or unverified accounts, mixed identity links, and mismatched search/redirect ownership.
3. Equal event timestamps across journey/event IDs, continuation in both sort directions, and filters retained across pages.
4. Production/staging/unlabelled records, date boundaries, and a journey starting before the requested window.
5. Several searches/events per journey, progressive results preceding completion, successful/partial/failed outcomes, and exact versus legacy handoffs.
6. Empty permitted cohorts and operational searches with no journey identity, ensuring no false zero on a storage failure.

The PostgreSQL suite accepts only `postgresql:` URLs pointing at `localhost` or `127.0.0.1`, with the exact database name `kurioticket_admin_journey_test` and no query string or fragment. It refuses an existing database, creates its own database, applies repository migrations, and drops only that newly created database afterward. The CI workflow runs it separately from the ingestion suite. Set `DATABASE_URL` to that disposable local target, then run actual named tests with:

```sh
JITI_TSCONFIG_PATHS=./tsconfig.json node --input-type=module --import jiti/register -e 'await import("./scripts/admin-journey.integration.ts")'
```
