# Global Admin alerts and navigation

## Navigation ownership

The canonical alert center now lives at `/admin/settings/notifications` within Settings, using the same protected-admin guards, read-only outage fallback, authoritative unread summary and acknowledgement API. The legacy `/admin/notifications` URL remains protected and redirects to this Settings page. The shared header bell remains its primary entry. System Status is the System landing page; Audit Logs, CMS Health and Email Delivery remain protected destinations reached from contextual actions, the profile menu, Overview or direct links rather than duplicate System tabs. Generic System/Logs/Alerts header shortcuts and duplicate Settings ownership-panel links are removed; the destinations themselves are not deleted.

Contextual email/provider diagnostics, Logs filtering/pagination, CMS repairs, test email, alert acknowledgement, homepage fare operations and the profile-menu Audit Logs shortcut remain. Database/authentication/admin-allowlist issues explain deployment ownership rather than linking in circles. Alert source destinations must be internal Admin routes and must not reload the Alerts list itself.

## Expanded rules

| Source | Verified trigger | Suppression / boundary |
| --- | --- | --- |
| Search | For each enabled FLIGHT/HOTEL/CAR product, both adjacent 15-minute windows have at least 20 attempts, at least 5 FAILED records and at least a 25% failure rate. 75% in both windows is critical. | Exact current deployment in SearchHistory JSON; authoritative feature flags/defaults after a successful read. SUCCESS (including zero offers) and PARTIAL do not count as FAILED. No alert from a single low-volume failure or one-window spike. |
| Support | Explicit URGENT tickets that are OPEN or WAITING_ON_TEAM. | Aggregate by actionable status; exclude customer-waiting/resolved/closed tickets. No invented SLA or deadline. Records are current-database scoped because no environment field exists. |
| Users/security | Active ADMIN accounts with explicit twoFactorDisabledAt in the last 24 hours and twoFactorEnabled still false. | No ordinary user notifications, inferred intrusion or compromise claim. Account records are current-database scoped. |
| CMS | A null or available=false integrity snapshot. | Unavailable data is not a healthy zero and does not record integrity recovery. |

Existing provider, email, homepage-fare, flight-status and confirmation-delivery rules remain. Search impact is a product-level aggregate, not a duplicate alert per failed request or a claim about a provider root cause. Exact incident correlation between independent existing provider alerts and end-to-end search impact is not inferred.

## Persistence and permissions

New conditions use the existing audit-backed monitoring pattern with source/environment-specific keys and serialized occurrence transitions. Repeated polling and count changes retain an occurrence token; verified recovery followed by recurrence creates another token, and critical escalation changes its severity suffix. Unknown source data does not record recovery. Existing 24-hour, per-admin, exact-signal acknowledgement is preserved. If occurrence persistence fails, verified problems remain visible but the UI does not offer a misleading durable acknowledgement.

Source reads use aggregate counts/timestamps, not customer email addresses, message bodies, credentials or raw exceptions. Partial read failures surface independently. Database failure suppresses dependent new-source noise. No schema migration, new package, public-web/native change or secret editor is introduced.

## Validation

Focused tests cover conservative thresholds, safe aggregation, source failure, query scopes, feature disablement, occurrence/recovery, per-admin acknowledgement, cache integration, internal destinations and navigation ownership. The new PR workflow runs them alongside the existing System, Email, CMS and Alerts contracts. Existing required PR gates perform the full web build/type validation.

`node qa/admin-system-cleanup/run.mjs` renders actual repository components before and after the change at desktop/mobile widths. Auth and records are explicitly labelled synthetic QA fixtures, not live operational data. It verifies four System tabs, the global bell, removed shortcuts, preserved diagnostic/test/acknowledgement controls, and no Alerts self-link. Evidence is uploaded as `admin-system-cleanup-evidence`.

## Settings consolidation (November 2026)

The Settings > Notifications page contains the active alert summary, operational alerts, trusted source links, and signal-specific 24-hour acknowledgements. The separate `Show acknowledged warnings` preference has been retired: the header bell lists all active alerts, with acknowledged ones clearly marked; canonical counts, alert detection and dismissal are unchanged. The legacy preference endpoint rejects authenticated reads/writes with 410, while existing preference rows and audit history are retained for historical integrity. The Settings > Recent changes page can still display prior notification preference changes. There are no new schema migrations or deletion of historical audit data.
