# Admin Overview: metric integrity and observation limits

The Operations Snapshot uses database-backed aggregates. Do not substitute example counts or zero for unavailable data.

- **Total users:** all User lifecycle rows (including deleted tombstones); this is not necessarily the number of usable customer accounts.
- **Enabled accounts:** User rows with status ACTIVE, including any active admin accounts. This is not an online-presence metric.
- **Recently observed visitors (5 min):** distinct consented Visitor records whose lastSeenAt was updated by an authenticated/consented activity request in the preceding five minutes. The metric is a **lower-bound observation of consenting browser/device identities**, not a count of unique humans or all people currently online. Multiple devices may create multiple visitor identities. Visitors without consent are intentionally excluded. The metric currently does not have a universal heartbeat and may miss people browsing without triggering activity requests.
- **Support and deletion attention:** current workflow status counts, not historical events.
- **Journeys and funnel:** consented journey events within the selected range, not all searches and not confirmed bookings.
- **Operational searches:** SearchHistory records in the selected range and environment; they may include searches without a consented journey.
- **Provider operational health:** observed provider logs over the stated 24-hour window; configuration/readiness is separate from actual call health.
- **Recent admin activity:** AdminAuditLog entries, not customer browsing history.

The overview refreshes its server snapshot every minute while the admin tab is visible, with a manual Refresh control. A successful refresh does not imply every metric measures instantaneous presence. The API fails closed when its database-backed summary cannot be loaded.

## Remaining work before claiming a true online-user count

Add privacy-reviewed, cross-platform presence heartbeats with explicit foreground/background behavior and server-side deduplication, an environment dimension, and coverage indicators. Validate consent withdrawal, expiry, sign-out, and multiple tabs/devices. Only then rename the observed metric to a carefully scoped live-presence measure. Do not treat AccountSession.lastSeenAt or Visitor.lastSeenAt as a perfect proof of a browser currently open.
