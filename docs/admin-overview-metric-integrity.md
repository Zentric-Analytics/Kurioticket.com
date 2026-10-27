# Admin Overview: metric integrity and observation limits

The Operations Snapshot uses database-backed aggregates. Do not substitute example counts or zero for unavailable data.

- **Total accounts:** all User records, including DELETED tombstones; this is not the number of usable customers.
- **Enabled accounts:** User records with status ACTIVE, including customer and staff roles.
- **Suspended accounts:** User records with status SUSPENDED.
- **Deleted accounts:** retained User records marked DELETED; permanently erased records cannot be counted.
- **Account role breakdown (backend):** ACTIVE records grouped by customer, admin, and support roles, plus pending-deletion accounts. These totals reconcile to the current account lifecycle snapshot, but the detailed breakdown is intentionally not repeated beneath Operations Snapshot.
- **Active users (Overview):** one headline card uses the genuine, consent-gated `websitePresence.total` observation for the past 90 seconds. It counts deduplicated verified signed-in accounts plus unlinked guest browser identities with visible, recent website heartbeats. It excludes native app activity and visitors who decline analytics. It is an observed lower bound, not the exact number of people online. This card does **not** change with the reporting-range selector.
- **Historical registered accounts with observed journey activity (backend):** distinct verified registered account IDs with eligible, consented journey activity in the selected time window, using existing journey ownership and environment rules. This remains available for funnel analytics but is no longer duplicated as a second Active Users card in the Overview.
- **Human admin actions:** audited events with a non-null adminUserId within the selected time range, excluding unattributed system entries.
- **Recently observed visitors (5 min), API only:** distinct consented Visitor records whose lastSeenAt was updated by an authenticated/consented activity request in the preceding five minutes. The metric remains available from the backend, but is not displayed on Overview; the single Active users card uses a separate heartbeat-based count. It is not a live user count.
- **Support and deletion attention:** current workflow status counts, not historical events.
- **Journeys and funnel:** consented journey events within the selected range, not all searches and not confirmed bookings.
- **Operational searches:** SearchHistory records in the selected range and environment; they may include searches without a consented journey.
- **Provider operational health:** observed provider logs over the stated 24-hour window; configuration/readiness is separate from actual call health.
- **Recent admin activity:** AdminAuditLog entries, not customer browsing history. Entries distinguish attributable human and system events, show explicit UTC timestamps, and show an unavailable state when the read fails.

The overview refreshes its server snapshot every minute while the admin tab is visible. The Operations Snapshot hides the deployment environment and UTC checked-at text, while the backend continues to scope each deployment and retain its observation timestamps for integrity. Account counts are current-state database rows, independent of the selected period; the hidden legacy visitor observation uses five minutes, the visible website presence metric uses 90-second foreground heartbeats, provider traffic uses 24 hours, and audit/journeys use the selected range. User rows have no environment field, so staging and production separation depends on deployment database isolation. A successful refresh does not imply every metric measures instantaneous presence. The API fails closed when its database-backed summary cannot be loaded.

## Scope limits of the Active users headline

The current heartbeat-backed value counts **observed, consented website** activity. It is not a universal online-population count: guests are browser identities, not necessarily unique people; nonconsenting website visitors are excluded; native app users are excluded; background/closed tabs expire; and a recently active tab is not proof of continuous attention. The status "Unavailable" remains distinct from a verified zero. Do not treat AccountSession.lastSeenAt or Visitor.lastSeenAt as proof of current website presence.

## Consented website presence (rolling 90 seconds)

The **Active users** card is based on explicit foreground website heartbeats, not the previous `Visitor.lastSeenAt` or customer account lifecycle counts. The website sends POST `/api/identity/presence` every 25 seconds while the public page is visible and the existing optional analytics consent has been confirmed. The endpoint checks a valid HttpOnly visitor cookie, a valid same-origin browser POST, the current consent record, and the authenticated account when applicable. It does not accept browser-supplied user IDs.

Each eligible visitor has a nullable last website-presence timestamp and its deployment environment. The Overview counts consented heartbeats less than 90 seconds old, deduplicates verified accounts across browser identities, and counts unlinked guest identities separately. Missing schema/storage produces **Unavailable**, never a fake zero. Staging and production are separated. A hidden or closed tab stops sending; expired timestamps cease contributing automatically. This metric **does not count people who declined analytics, offline tabs, native-app activity, or every person on the website**. It is an observed lower bound, not a guaranteed exact online count. Consent withdrawal clears the presence fields and the query excludes withdrawn consent immediately.

## Overview presentation and non-duplication

Operations Snapshot remains the single concise location for nine headline metrics. On desktop it uses three balanced rows of three; smaller widths use a two-column responsive grid. Detailed enabled-account role totals and the older five-minute observed-visitor count are **not repeated below the Snapshot**. They remain computed in the canonical service response for other administrative consumers and auditing; no statuses, user records, attribution rules, or data collection have been removed.

The single Active users card shows the live 90-second consenting website-presence estimate, including registered accounts and guest browser identities. Its explanation of consent, coverage, and independence from the reporting-range selector remains behind the keyboard-operable "How it's counted" disclosure. The historical journey account count remains in the backend analytics response and is no longer displayed as a duplicate card.

## Phase 2 — Provider operational integrity

Readiness means provider configuration permits requests; it never guarantees successful upstream responses or real booking availability. Operational health uses the last 24 hours of environment-scoped `ApiProviderLog` records, independently of the Overview reporting-range selector.

Each provider reports successful, degraded, failed and disabled calls. **Attempted calls** exclude disabled requests. Failure rate is failed/attempted, or unavailable when no calls were attempted. A ready provider is classified **FAILING** when there are failures but no successes, or when at least ten attempts have a failure rate of 75% or more; otherwise adverse calls classify it **DEGRADED**. A ready provider with only disabled calls has **NO_RECENT_ACTIVITY**, never HEALTHY. The separate flight/hotel/car service breakdown includes zero-traffic services and safe, aggregated failure categories (no raw provider responses). These read-only changes do not overwrite historic logs or attempt live provider retests.

The Operational Search Health section separately reports `PARTIAL` SearchHistory outcomes that returned at least one offer and those that returned no offers. Partial is an operational processing state, not a guarantee that usable inventory reached the customer. Both subcounts come from the same environment and reporting-range filter and must add up to all partial searches.

### Staging diagnosis observed October 27, 2026

In the inspected rolling 24-hour staging logs, KAYAK sandbox reported 111 authorization-related FAILED calls (110 flight, 1 hotel) and 1 successful flight call. The service returns sanitized `unauthorized` for 401/403 provider responses. **Root cause not yet confirmed:** credentials, provider authorization/entitlements, gateway policy, and account permissions require verification with the provider. Do not change keys or silently bypass these errors; never publish raw credentials or upstream responses. Duffel separately recorded 111 successful flight calls in that observation window. These figures are historical observations, not hardcoded dashboard values.

## Phase 3 — Provider handoff coverage and consent integrity

The Handoff Correlation area reports both environment-scoped provider redirects and their **separately validated** consented journey coverage. `operationalHandoffs.total` includes every explicitly environment-tagged redirect in the selected date window, including records without a visitor ID. `inConsentedJourneys` and `outsideConsentedJourneys` reconcile to that total. Eligible handoffs are validated against the existing journey consent, current-account eligibility, source ownership and environment predicates; `exactSearchLinks` requires an explicit verified search. A legacy handoff outside that set is never guessed into a funnel. `withoutVisitorIdentity` means no visitor attribution was stored, not necessarily that someone declined consent. Untagged legacy records remain outside an environment-specific total. The field definitions and time-window caveats are in `docs/admin-journey-data.md`.

This is a read-only reporting improvement: it creates no synthetic events, changes no visitor consent or database records, and does not claim a provider handoff is a completed booking.

## Phase 4 — Dashboard interpretation and status clarity

No metric backend calculation or section layout changed. Account and workflow counts represent **current database state**; consented active website identities represent the **rolling 90-second window**; recorded journeys and human-attributed audit rows use the **selected reporting range**; provider calls use their separate **24-hour window**. The provider attention count now includes NOT_READY, as well as DEGRADED and FAILING, so an integration blocked from running is not silently treated as healthy. NO_RECENT_ACTIVITY stays distinct, and a zero attention count is not proof of successful traffic.

Platform configuration alone is not verified authentication, email delivery, or provider authorization. Missing recent success/failure timestamps are labelled "None recorded in window" rather than "Unavailable", and no attempted-call timing is "No timing recorded", not zero. Search SUCCESS means processing finished even if it returned no offers; PARTIAL can also have zero results. Observed journey stages can arrive out of order and must not be interpreted as linear conversion rates, bookings or revenue.

## Default Overview reporting window — October 27, 2026

The Operations Snapshot picker now defaults to **Last 24 hours** on `/admin` or when an unsupported range is supplied. A deliberate seven-day or 30-day selection remains available through `/admin?range=7d` or `/admin?range=30d`. Each recognized window explicitly passes matching UTC `from` and `to` bounds into the canonical Overview service, rather than relying on a different implicit backend default. Direct calls to the Overview API without time parameters also default to the rolling 24-hour period. Refreshing preserves explicitly selected ranges.

The selected window applies to historical journeys, search outcomes, redirect attribution and human audit actions. It **does not** change current account/support/deletion statuses, the separate 90-second consented Active Website Users heartbeat, or provider logs' 24-hour observation window. No historical data is changed or synthesized.
