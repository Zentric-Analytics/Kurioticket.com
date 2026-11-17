# Admin visibility follow-up — 2026-11-17

Repository: `Zentric-Analytics/Kurioticket.com`. Baseline: `dev` commit `6f68dc7e76add4321c6923b3f7b1df0d79dc172a`.

## Objective and boundary

Preserve all existing admin pages, routes, data readers, permissions, actions and compatibility redirects. Distinguish missing source data from a genuinely empty result and make serious existing alert information more discoverable. This change does not activate legacy controls.

## Verified route and visibility inventory

- `/admin/search`: authenticated full-page admin search remains available directly; current header uses the distinct `AdminWorkspaceSearch` overlay. No extra global navigation item added.
- `/admin/content/homepage`: existing homepage CMS overview is preserved. The four-card Content landing links directly to its individual destinations/flight routes/hotel destinations/FAQ areas; the overview remains accessible from existing CMS return links, including `?from=overview`.
- `/admin/confirmed-trips/records`: existing secondary confirmed-trip directory and `/admin/confirmed-trips/records/[id]` details remain unchanged because pagination and detail destinations still refer to these routes.
- `GuestTrackingActions.tsx`: client component and `/api/admin/guests/[id]/tracking` action exist, but current Users/activity pages do not import the component. It can disable guest tracking; not activated pending privacy, eligibility and authorization review.
- `ProviderHealthPanel.tsx`: legacy manual Duffel health-check UI remains unmounted in the current Providers page. Current Providers and Platform Health use different service readers. Do not expose another health-test control without verification.
- `AdminPageShellHistorical.tsx`: exports both the current shared shell widgets and an older `AdminShell` with sidebar. The active admin layout mounts `AdminHorizontalShell`. Preserve historical module because current components still import its exports.
- `SearchWorkspaceTabs.tsx` and `RecentConfirmedTripTable.tsx`: no current page imports found in repository search; keep files, tests and old URL compatibility untouched.
- Staging-only `/admin/preview-testers`, filtered guest cohorts, archived CMS actions and destructive identity/deletion operations remain restricted.

## Safe fixes in this PR

1. **Users** — the previous `withOptionalDb` fallback returned empty rows and zero counts on missing/failed database reads, indistinguishable from a valid empty query. The page now distinguishes a null failure result and shows a truthful unavailable panel with an existing-filter-preserving retry URL. The successful registered/guest directory, data queries, dates and filters are unchanged.
2. **Trip monitoring** — `ConfirmedTripDeliveryAlerts` opens its existing disclosure by default only when there is an **unacknowledged CRITICAL** alert; all alerts and their acknowledgement actions remain in the same protected component. Empty, unavailable and inactive-feed behavior is unchanged.

## Visibility conditions intentionally retained

- Trip confirmation delivery alert component renders only when feed readiness is true and caller authorization is satisfied.
- CMS Health has expandable scope groups and per-scope diagnostics; important unhealthy groups already default open.
- Provider Directory has expandable per-provider diagnostic rows and controlled retest actions.
- Email Delivery withholds history when its authoritative store is unreadable and displays the explicit unavailable message rather than invented zero results.
- Homepage Fares Market Coverage, Inspector and Diagnostics require available telemetry; loading/unavailable states must remain honest.
- Admin global search overlay temporarily hides underlying page content only while open.

## Manual staging validation still required

Source checks and CI cannot establish the actual browser behavior of authenticated staging. Review with an authorized role at 100% zoom and narrower widths:

1. Users with a healthy, truly empty query: empty directory still renders as before.
2. Users with a failed/unconfigured database read: unavailable panel, no false zero counts, retry preserves filters.
3. Trip monitoring with no alerts, acknowledged/noncritical alerts, and unacknowledged critical alerts: only the critical condition auto-opens details; no unauthorized content.
4. Admin Search and CMS Homepage overview deep links; preserve return URLs and all existing navigation.
5. Provider, CMS Health, Email Delivery and Homepage Fare disclosure/loading states without bypassing permissions.

No deletion, merging, automatic activation of dormant components, or production deployment is authorized by this follow-up.
