# Admin Overview: metric integrity and observation limits

The Operations Snapshot uses database-backed aggregates. Do not substitute example counts or zero for unavailable data.

- **Total accounts:** all User records, including DELETED tombstones; this is not the number of usable customers.
- **Enabled accounts:** User records with status ACTIVE, including customer and staff roles.
- **Suspended accounts:** User records with status SUSPENDED.
- **Deleted accounts:** retained User records marked DELETED; permanently erased records cannot be counted.
- **Account role breakdown (backend):** ACTIVE records grouped by customer, admin, and support roles, plus pending-deletion accounts. These totals reconcile to the current account lifecycle snapshot, but the detailed breakdown is intentionally not repeated beneath Operations Snapshot.
- **Online Users (Overview):** `onlinePresence.total` counts distinct verified active accounts plus guest sessions seen in the last 90 seconds on desktop web, mobile web, Android and iOS. Guest sessions can represent the same person on different devices. The count is independent of the reporting period.
- **Historical registered accounts with observed journey activity (backend):** distinct verified registered account IDs with eligible, consented journey activity in the selected time window, using existing journey ownership and environment rules. This remains available for funnel analytics but is no longer duplicated as a second Active Users card in the Overview.
- **Human admin actions:** audited events with a non-null adminUserId within the selected time range, excluding unattributed system entries.
- **Recently observed visitors (5 min), API only:** distinct consented Visitor records whose lastSeenAt was updated by an authenticated/consented activity request in the preceding five minutes. The metric remains available from the backend, but is not displayed on Overview; the single Active users card uses a separate heartbeat-based count. It is not a live user count.
- **Support and deletion attention:** current workflow status counts, not historical events.
- **Journeys and funnel:** consented journey events within the selected range, not all searches and not confirmed bookings.
- **Operational searches:** SearchHistory records in the selected range and environment; they may include searches without a consented journey.
- **Provider operational health:** observed provider logs over the stated 24-hour window; configuration/readiness is separate from actual call health.
- **Recent admin activity:** AdminAuditLog entries, not customer browsing history. Entries distinguish attributable human and system events, show explicit UTC timestamps, and show an unavailable state when the read fails.

The Online Users card refreshes through an authenticated presence-only endpoint every 30 seconds while the Overview tab is visible. The Overview labels its deployment Staging or Production. The shared reporting period supplies the same inclusive start and exclusive end to Platform Search Activity and the historical Operations Snapshot metrics. Total accounts and Online Users use current state, and provider traffic uses its own 24-hour window. User rows have no environment field, so account totals depend on deployment database isolation. The API fails closed when it cannot load its database-backed summary.

## Operational presence

Website pages send a heartbeat every 30 seconds while visible and connected, including Admin dashboard routes for authenticated accounts. Android and iOS send while the app is active and focused. Verified active accounts of all roles (USER, SUPPORT, ADMIN), together with unauthenticated presence sessions, contribute to the same online metrics. Reading without interaction keeps presence current. After a tab closes or hides or the app backgrounds or disconnects, its last heartbeat can contribute for up to 90 seconds. Existing authentication expiry and logout still apply.

A deployment needs its existing configured database and valid server-side `AUTH_SECRET` (or `NEXTAUTH_SECRET`). No new Render environment variable or online-presence feature flag is necessary. The metric shows **Not configured** only if a required existing database or signing configuration is missing. With configuration in place, the snapshot exercises the actual heartbeat insert and renewal in a short transaction and removes the probe before it becomes visible, then reads the active count. It shows **Unavailable** on inconsistent public origins, a heartbeat handler failure observed by the current server in the last 90 seconds, probe failure, or aggregate failure and **0** when the probe succeeds and no eligible sessions remain. The database probe verifies the server-side write path. Check both public endpoints and any trusted ingress classifier during rollout to verify delivery from clients.

Native builds before PR #6823 cannot send presence. Builds with that PR still require recent touch activity until they receive this foreground update. Deliver it to Android and iOS through a compatible Expo update on the installed build's channel and runtime. If compatibility cannot be established, distribute new Preview builds (Android APK, iOS TestFlight) or new production store builds through their existing release pipelines. Preview targets `https://staging.kurioticket.com` and uses a fingerprint runtime. The checked-in Preview 0.3.0 build 4 and Production 0.3.0 Android build 5 and iOS build 4 source revisions predate the presence hook. Inspect the device’s installed update identity before treating any of those binaries as covered.

An environment- and transport-bound, signed, 30-minute credential identifies a source. The website and native clients keep this credential only in memory and never write a separate online-presence cookie or browser storage entry. Active same-origin browser tabs share their credential through an in-memory BroadcastChannel when available; a full navigation or reload can create a new anonymous source until the previous one expires after 90 seconds. The client must return the issued credential before a session is counted. Active clients renew it before expiry, preserving the source. One source can switch from guest to verified account on sign-in. Signed-in counts deduplicate across sources using canonical account sessions and recheck revocation, expiry, account status, verification and session version. Separate browser profiles or app restarts can create separate guest sessions. Browsers without reliable cross-tab coordination may briefly report two guest sources if tabs open simultaneously before a cookie exists. Native guest platform comes from the client transport declaration, canonical mobile session metadata takes precedence for accounts, and browser platform uses client hints with a device-type fallback.

The Users Directory displays a separate four-card Online Users row: overall online presence, iOS, Android, and Website. Website is the union of desktop and mobile web presence, deduplicating verified signed-in accounts of all roles across both while counting anonymous presence credentials as sessions. It is not calculated by summing the two web counters. These live cards use the independent 90-second window and do not change with the directory's historical date filters. The underlying platform breakdown remains available in Platforms & Devices.\n\nThe store keeps the environment, a hash of the random source ID, platform, latest heartbeat and an optional canonical account session reference. The route does not record events, URLs, IP addresses, user-agent strings, search terms or device fingerprints. Presence has no link to the optional analytics visitor identifier. Admins read the aggregate through the existing authorization boundary. Revoked account sessions stop contributing, and deleting a canonical session cascades to its presence rows. Bounded sweeps on presence reads and writes remove rows after 15 minutes. During a prolonged shutdown, run `DELETE FROM "OnlinePresenceSession" WHERE "lastSeenAt" < CURRENT_TIMESTAMP - INTERVAL '15 minutes';` on each deployment database for physical cleanup. Logical expiration always follows the 90-second window.

Browser automation identified through WebDriver skips the heartbeat. A trusted ingress classifier can exclude verified traffic on both endpoints using `ONLINE_PRESENCE_INGRESS_SECRET` and `X-Kt-Verified-Automation`. The header contains the Unix timestamp in milliseconds, a dot, and a base64url HMAC-SHA256 over newline-separated `verified-automation-v1`, deployment environment, endpoint pathname and timestamp. Use a distinct key per environment, strip inbound copies of the header at ingress, and sign only verified bots or approved automation. The server allows 60 seconds of clock skew and ignores invalid proofs. User-agent strings alone do not identify bots. Automation that the browser or ingress cannot verify may contribute.

**Purpose and privacy review.** Kurioticket uses aggregate operational presence to understand live load and investigate service degradation. Service reliability and incident response are the documented operational purposes; the privacy owner must confirm the applicable lawful basis and disclosures before this automatic monitoring ships to production. The dedicated web credential is memory-only (no online-presence cookie or local/session storage), and the database retains only short-lived, minimal operational state. Cross-tab sharing is ephemeral and never persisted. This reduces device-storage concerns but does not eliminate the need for a privacy and retention review. Optional analytics choices and withdrawal continue to govern the existing visitor and journey pipelines.

## Previous Overview implementation

The sections below retain historical context. The consented website heartbeat and `websitePresence` API field remain available for existing consumers.

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

## Final Overview accuracy and readability polish (October 27, 2026)
Provider failure rates now display one decimal place and extremely small nonzero failures as `<0.1%`. Disabled calls remain excluded from the attempted denominator. The Overview and Providers screens share formatting. Contributed consented events remain distinct from all operational searches. Recent Admin Activity is explicitly the latest six audit records regardless of selected range. Compactness and typography are improved while keeping diagnostics visible. No recorded data or reporting windows change.


## Compact Overview presentation (October 27, 2026)

The Overview is an **operational summary and navigation surface**, not an exhaustive report. It now presents four primary metrics (total accounts, consented active website identities, operational searches and eligible customer journeys), three actionable attention counts, four consented visitor-action counts, four operational search outcomes, three outbound-handoff counts, three per-provider call health figures, three per-workload counts, four technical readiness/configuration indicators, and the three most recent audit actions. Each summary links to the existing dedicated admin page.

This is **presentation-only**. The authenticated, environment-scoped canonical Overview reads, underlying database models, reconciliations, date windows, consent checks, failure rates, and provider classifications have not been changed. All operational search rows are deliberately separate from consented journey events; outbound redirects do not prove bookings. Configured credentials are not proof of successful email delivery, provider authorization or end-to-end sign-in. Active website users still uses the independent 90-second presence window. Provider health continues to use its independent 24-hour observation window. The selected period continues to apply to historical searches, journeys, redirects, and audit action totals. Recent Admin Activity continues to show the newest actions across all dates, now limited to three on the Overview.

Full provider service breakdowns, failure reasons, call timings and last-error/success timestamps remain available at `/admin/providers`; full customer-journey rows at `/admin/journeys`; search operations at `/admin/searches/activity`; outbound redirects at `/admin/redirects`; support queues at `/admin/support`; deletion workflows at `/admin/account-deletions`; platform configuration at `/admin/system`; audit records at `/admin/logs`. The new Overview cards and sections include direct navigation shortcuts to these actual routes. No backend data or records have been removed or inferred. A failed overview read continues to show an unavailable state, not fabricated numbers.


### Proposed staging-only guest access preview (not approved for activation)

GUEST_FIRST_ACCESS_PREVIEW is disabled by default and always disabled in production.
The nullable migration does not backfill existing records. Do not enable collection
on customer traffic until the privacy owner confirms operational necessity, lawful
basis, disclosures and retention; use isolated synthetic QA first.

The preview observes first access only after the guest returns a verified presence
credential. It stores coarse device information and trusted-edge country only in the
existing short-lived presence row (90-second live window, 15-minute cleanup).
It creates no new cookie, raw IP, city, raw user agent, fingerprint, optional
page history or persistent visitor ID. The existing writer is the fallback
if preview storage fails. A new live interval or intervening account resets first seen.

The Admin live View Activity key is a domain-separated HMAC of the existing
hashed source and environment; it is not a credential and requires Admin
authorization plus an exact current observation. It never joins operational
search or Analytics visitor IDs. Historical guest first-access association and
retention require a separate reviewed design. This preview does not implement
that association and is not a substitute for the requested historical activity view.

Staging retention sweeps also clear preview fields on account-owned rows, stale observations and when the preview is disabled. Physical cleanup is best effort; logical visibility is restricted to exact current guest observations. The preview needs database-backed expiry and transition testing before activation.


### Read-only staging live guest navigation

The live View Activity action can use the existing verified guest roster even
when GUEST_FIRST_ACCESS_PREVIEW is disabled. It does not start a new collection,
set a cookie, or change counts or historical readers. Its domain-separated HMAC
is computed from the existing hashed source and environment; it is not persisted
or usable as a presence credential. Admin authorization and a fresh verified
anonymous roster match are required on every page load. A signed-in, expired
or unverified row cannot resolve. The same memory credential can regain the same
navigation key if it becomes active again; this is not a durable visitor identity.
When optional preview details are absent, first access is explicitly "Not recorded"
and location/device details are unavailable. Production keeps its existing behavior.
No historical search or visitor association is implemented by this read-only view.


Guest activity navigation disables link prefetch and checks both the roster
snapshot and the selected heartbeat against the live window at render time.
Ambiguous references fail closed. The page labels the verification timestamp;
an open page is a snapshot, not a continuous online-status guarantee.

### Historical guest access continuity: proposal for privacy and engineering review

This proposal is not authorization to retain additional customer history.
Do not implement or activate the historical association until the privacy owner
approves the purpose, lawful basis, exact fields, retention, disclosure and
deletion treatment. Retain the present operational search and consent boundaries.

Proposed evidence requirements for a guest who later makes a qualifying search:

- Reuse an existing memory-only presence credential on the real search request
  through a reviewed same-origin or native transport. Never place that credential
  in a URL, new cookie, analytics event, persistent storage or an Admin response.
- Independently verify its signature, expiry, transport and environment. Require
  a current anonymous presence row with an exact source match, a recorded first
  access and a verified heartbeat within the existing 90-second window.
- Obtain the existing operational guest identity only from the server-admitted
  search flow; never trust a client-supplied historical ID. Recheck ownership
  and the live observation atomically before admitting any association. Exclude
  authenticated, linked, expired, bot and conflicting identities. No IP, device
  similarity, destination, time proximity or user-agent matching.
- If historical retention is approved, attach only explicitly approved access
  fields to the already-qualified operational history, with bounded retention
  and deletion enforcement. Do not persist the presence credential, source
  hash or live navigation reference in that history. Do not backfill old rows.
- Existing consented page/journey evidence remains subject to the existing
  consent and ownership checks, including withdrawal. Do not merge the optional
  Analytics visitor and operational identities merely because a request has both.

A full browser reload, lost memory credential, older native build or expired
session can prevent an exact association. In that case display only the
independently recorded history and mark first access unavailable; do not guess
or create a persistent cross-session identifier to fill gaps.

Required acceptance cases (isolated synthetic database and all four clients):
arrival without a search; declined/granted/withdrawn consent; verified first
search and repeated searches; unrelated simultaneous guests; expired or forged
credentials; sign-in/out; missing memory credential; environment mismatch;
recording and deletion failures; correct chronology, pagination, and exact
identity-scoped navigation. No new optional page, filter or interaction writes
may occur under rejected consent. No provider availability or result accounting
changes are in scope. The approval and database/client integration remain open.

**Current scope decision (2026-11-26):** Historical guest first-access continuity is explicitly deferred. No permanent guest identity on initial access, historical association, backfill, or new long-term guest retention is authorized by this change. The short-lived live-access/location preview remains staging-only, disabled by default, and subject to a separately verified trusted ingress and privacy-owner approval before activation. The read-only live guest navigation can operate without enabling the optional preview.

### Independent live guest country and Directory Activity (2026-11-26)
The temporary country-only staging trial is independent of `GUEST_FIRST_ACCESS_PREVIEW` and is disabled unless `GUEST_LIVE_COUNTRY_ENABLED=true`. Historical first-access continuity remains deferred; leave the first-access preview disabled. The existing verified, returned presence credential is the only guest source. No permanent ID, analytics event, cookie, search association, city, IP address, raw user-agent or historical backfill is created by this feature.

Only the authenticated bot-security edge assertion can supply the current ISO country code. `RENDER=true`, ordinary Cloudflare headers, selected market, device locale, travel destination and existing visitor records are not sufficient. Confirm the edge strips inbound assertions and country headers and sets both from its own trusted observation, including website and native endpoints. The new nullable fields are scoped to the exact accepted heartbeat; subsequent unknown observations clear country, authenticated transitions clear guest metadata, 90-second visibility and bounded 15-minute cleanup remain unchanged. The reader never uses the legacy preview country. Migration or country storage failure must not hide verified presence.

The Admin link is now `/admin/users/live-guest/[reference]/activity`, selects Users Directory, has a Users breadcrumb, and shows only the latest verified access using the shared Activity list. The legacy Online Users route redirects after admin authentication. No history filters, historical search counts or permanent customer ID are invented. Invalid, expired and wrong-environment references fail closed.

Rollout: validate additive migration and all PR checks, confirm privacy-owner approval for temporary country-only observation and authenticated edge coverage, deploy to staging through normal approval, then set only the country flag. Verify consent-declined/no-search website and native sessions return a country where the trusted edge provides one. Leave unavailable on untrusted/missing evidence. Disable the flag to stop reads/writes and clear retained country through existing cleanup. Do not enable production or historical continuity as part of this change.

### Shared Activity workspace follow-up
Live guest references now enter the same `[kind]/[id]/activity` and `activity/all` routes as recorded identities, via a reserved live-guest branch before historical validation. The same presentational workspace renders the identity header, six metrics and recent activity for all identity types. A temporary unlinked session displays unavailable historical metrics and never claims zero historical activity or a permanent ID. Its full view shows the latest verified access, with historical categories unavailable until independently authorized ownership exists. No first-access or historical association, country flags, storage or consent behavior changes are included. Every live view rechecks admin authorization, staging environment and roster freshness.
