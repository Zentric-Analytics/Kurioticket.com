# Admin Overview: metric integrity and observation limits

The Operations Snapshot uses database-backed aggregates. Do not substitute example counts or zero for unavailable data.

- **Total accounts:** all User records, including DELETED tombstones; this is not the number of usable customers.
- **Enabled accounts:** User records with status ACTIVE, including customer and staff roles.
- **Suspended accounts:** User records with status SUSPENDED.
- **Deleted accounts:** retained User records marked DELETED; permanently erased records cannot be counted.
- **Account role breakdown (backend):** ACTIVE records grouped by customer, admin, and support roles, plus pending-deletion accounts. These totals reconcile to the current account lifecycle snapshot, but the detailed breakdown is intentionally not repeated beneath Operations Snapshot.
- **Active users (observed):** distinct verified registered account IDs with eligible, consented journey activity in the selected time window, using existing journey ownership and environment rules. This is a lower bound, not everyone online and not all possible account activity.
- **Human admin actions:** audited events with a non-null adminUserId within the selected time range, excluding unattributed system entries.
- **Recently observed visitors (5 min), API only:** distinct consented Visitor records whose lastSeenAt was updated by an authenticated/consented activity request in the preceding five minutes. The metric remains available from the backend, but is not displayed on Overview alongside the separate heartbeat-based online visitor card. It is not a live user count.
- **Support and deletion attention:** current workflow status counts, not historical events.
- **Journeys and funnel:** consented journey events within the selected range, not all searches and not confirmed bookings.
- **Operational searches:** SearchHistory records in the selected range and environment; they may include searches without a consented journey.
- **Provider operational health:** observed provider logs over the stated 24-hour window; configuration/readiness is separate from actual call health.
- **Recent admin activity:** AdminAuditLog entries, not customer browsing history. Entries distinguish attributable human and system events, show explicit UTC timestamps, and show an unavailable state when the read fails.

The overview refreshes its server snapshot every minute while the admin tab is visible. The page displays the deployment environment and snapshot check time in UTC. Account counts are current-state database rows, independent of the selected period; the hidden legacy visitor observation uses five minutes, the visible website presence metric uses 90-second foreground heartbeats, provider traffic uses 24 hours, and audit/journeys use the selected range. User rows have no environment field, so staging and production separation depends on deployment database isolation. A successful refresh does not imply every metric measures instantaneous presence. The API fails closed when its database-backed summary cannot be loaded.

## Remaining work before claiming a true online-user count

Add privacy-reviewed, cross-platform presence heartbeats with explicit foreground/background behavior and server-side deduplication, an environment dimension, and coverage indicators. Validate consent withdrawal, expiry, sign-out, and multiple tabs/devices. Only then rename the observed metric to a carefully scoped live-presence measure. Do not treat AccountSession.lastSeenAt or Visitor.lastSeenAt as a perfect proof of a browser currently open.

## Consented website presence (rolling 90 seconds)

The **Online website visitors (observed)** card is based on explicit foreground website heartbeats, not the previous `Visitor.lastSeenAt` or customer account lifecycle counts. The website sends POST `/api/identity/presence` every 25 seconds while the public page is visible and the existing optional analytics consent has been confirmed. The endpoint checks a valid HttpOnly visitor cookie, a valid same-origin browser POST, the current consent record, and the authenticated account when applicable. It does not accept browser-supplied user IDs.

Each eligible visitor has a nullable last website-presence timestamp and its deployment environment. The Overview counts consented heartbeats less than 90 seconds old, deduplicates verified accounts across browser identities, and counts unlinked guest identities separately. Missing schema/storage produces **Unavailable**, never a fake zero. Staging and production are separated. A hidden or closed tab stops sending; expired timestamps cease contributing automatically. This metric **does not count people who declined analytics, offline tabs, native-app activity, or every person on the website**. It is an observed lower bound, not a guaranteed exact online count. Consent withdrawal clears the presence fields and the query excludes withdrawn consent immediately.

## Overview presentation and non-duplication

Operations Snapshot remains the single concise location for its ten existing headline metrics. On wide desktops it uses two balanced rows of five; smaller widths use a two-column responsive grid. Detailed enabled-account role totals and the older five-minute observed-visitor count are **not repeated below the Snapshot**. They remain computed in the canonical service response for other administrative consumers and auditing; no statuses, user records, attribution rules, or data collection have been removed.

The website presence card includes a short breakdown of registered accounts and guest identities. Its longer explanation of consent and coverage limitations is behind an accessible, keyboard-operable "How it's counted" disclosure within that card. The selected-range Active Users metric is a distinct historical journey measure, not the live website presence count.
