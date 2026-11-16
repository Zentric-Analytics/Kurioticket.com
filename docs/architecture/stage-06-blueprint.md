# Stage 06 implementation blueprint

Status: architecture only; no Stage 06 UI in this change. Repository baseline c61fd0b8a on dev. Release remediation and live acceptance are separate gates, recorded in the delivered report.

## Existing architecture and reuse

AdminLayout validates canonical web admin sessions, wraps pages in AdminHorizontalShell and restricts DB-outage emergency access to a safe outage notice. Normal API access requires active, verified ADMIN plus configured administrator email; navigation visibility is not authorization. Preserve support/user restrictions and the staging Preview company-email rules. Do not extend the outage token to operational reads or mutations.

Reuse AdminPageShell/AdminSectionCard/AdminFilterBar/AdminSelect/AdminDataTable/AdminStatusBadge and existing empty/loading/error conventions. AdminHorizontalShell and adminNavigation own horizontal/compact navigation and global search. Overview uses adminOverviewService/AdminOverviewDashboard and existing website visitor/presence definitions. System retains configuration/readiness at /admin/system. Search Activity lives at /admin/searches/activity with product/status/provider/identity/time filters and record drill-down; /admin/searches is a legacy redirect. Providers owns provider readiness, handoffs and referral attribution; confirmed trips remain distinct. Notifications uses existing alert occurrences/acknowledgments. CMS uses current scope/publication/revision/health flows. Settings uses FeatureControlsPanel; Email Delivery and Audit Logs retain dedicated pages.

## Confirmed reporting contract

GET /api/admin/platform-operations?hours=24: integer 1–720, unknown keys rejected; authenticated admin, private no-store. Environment comes from getPublicEnvironment, not query input. Duplicate hours rejection should be explicitly tested before UI acceptance (current handler reads the first value). Server components may call readPlatformOperations directly only behind canonical page authorization.

Response:
- environment, window.from/to: current deployment and requested activity window.
- activity.state AVAILABLE or MONITORING_UNAVAILABLE; activity.data null or searches/handoffs/providerCalls. Each has combined and applications.WEB/IOS/ANDROID/UNKNOWN, with total/successful/partial/failed/disabled/averageLatencyMs/state.
- database.state: MONITORING_UNAVAILABLE / HEALTHY / FAILING / UNKNOWN, based on safe DB readiness.
- providerHealth: existing provider status reader, or null. It is service/provider health, not necessarily filtered by selected application.
- email: existing 24-hour delivery signal, independent of requested activity window; unavailable explicit.
- cms: existing CMS totals/availability, not a per-app publication success metric.
- alerts: existing critical/warning counts or null; link to existing occurrences instead of inventing new alerts.
- scheduledJobs: OBSERVED/UNKNOWN/MONITORING_UNAVAILABLE and at most 100 newest job/provider/status/observedAt rows in the selected environment/window.
- release: existing staging release readiness, not a newly executed build or installed-version inventory.
- nativeApplicationHealth: UNKNOWN, no installed-device crash source configured.

Activity provenance: SearchHistory.query.applicationSource/environment; RedirectLog.metadata.applicationSource/environment; ApiProviderLog.metadata.applicationSource/environment excluding service scheduled-job. Queries UNION independent aggregates in a RepeatableRead transaction. Missing source maps UNKNOWN only within explicitly environment-scoped records; rows missing environment are excluded, not silently assigned. These totals need not match legacy history pages with different environment/date rules. No synthetic history backfill.

Totals reconcile within each measure. Failure rate = failed / (total - disabled), null when denominator zero. Partial is separately visible. Fewer than ten attempts is UNKNOWN, >=50% failures FAILING, any other failures/partial DEGRADED, all disabled DISABLED, otherwise HEALTHY. Do not sum searches, provider calls and handoffs into one total. Null latency stays unavailable, not zero; no percentiles/time series exist. Healthy attributed operations do not establish healthy installed apps or website JavaScript/crash health. Session platform is a validated declaration bound to authentication, not hardware attestation.

## Component/file plan

Create src/app/admin/platform-health/page.tsx (server authorization, query parsing, metadata), loading.tsx and error.tsx; src/components/admin/PlatformHealthDashboard.tsx; PlatformHealthFilters.tsx; OperationalStatus.tsx; PlatformActivitySummary.tsx; ScheduledJobObservations.tsx. Keep data shaping in small pure presenter helpers with contract tests, not another monitoring service. No new chart library or SDK.

Modify src/lib/adminNavigation.ts to add ADMIN-only Platform Health under System & security; ensure header and global search discover it without duplicating System. Modify src/app/admin/page.tsx and AdminOverviewDashboard only to add a concise platform summary/link, leaving existing website-only totals and ranges labeled unchanged. Reuse existing detail links to providers, searches/activity, redirects, notifications, email-delivery, system/cms-health, settings and logs. Do not replace functional modules.

Create one typed application filter (All Platforms, Website, iOS, Android, Unknown) shared by health and activity. Health selects already-returned partitions locally; selected application must not imply provider/email/DB/CMS/release panels are platform-filtered. Show scope labels. Use URL-backed hours/application selection and explicit refresh with last-observed time; no continuous polling required. Support 24h/7d/30d within existing bounds. Preserve selection on investigation/back navigation; reset cursor when filters change.

Search Activity requires a genuine missing backend extension before rendering a platform selector:
1. Extend AdminSearchScope/AdminSearchRead in src/services/adminOperationalReadContract.ts with optional applicationSource and bounded appVersion display where present; retain strict parsing and scope-bound cursors.
2. Extend adminOperationalReadCore.ts list, summary and detail mapping with consistent normalized source predicates over query JSON. UNKNOWN includes null/malformed/unrecognized source; WEB must never include UNKNOWN. Ensure SQL summary and Prisma list predicates agree. Environment remains server-authorized.
3. Extend src/lib/adminSearchWorkspace.ts and adminSearchActivityNavigation.ts filter allowlists; update Search Activity page, SearchMonitorTable and detail presentation to preserve/display source. Update existing /api/admin/searches list/summary/detail adapters through their shared reader, not a parallel API. List filtering must occur in backend before pagination, never client-side after fetch.
4. Product-specific or platform-scoped failure drill-down cannot be promised by the aggregate endpoint yet: activity currently groups neither product nor record IDs. Link to appropriate filtered search records; if matching window semantics are needed, add explicit bounded from/to support with regression coverage. Do not pretend provider-call or handoff filters exist. Add source-aware handoff/journey contracts only when those views actually expose filters, as separate scoped work.

Scheduled jobs need an additive safe run projection before displaying completion/duration/stuck labels: current output omits metadata.state, completedAt and latencyMs. RUNNING is stored as DEGRADED with metadata state; current status alone cannot distinguish running vs completed degraded. Extend the existing reader with validated outcome/completion/duration fields, preserving old fields, and test RUNNING/failed finish/missing metadata. Do not infer missed cron or uptime without schedule/heartbeat evidence. Existing rows are observations, not a scheduler inventory.

Expose feature-control scope as shared backend behavior plus current environment; retain existing protected mutation API, reasons, production reauthentication and audit. Link CMS scopes/publication/health instead of creating per-app CMS copies. API availability and content consumption are different evidence.

## Implementation order and acceptance

1. Gate on remediation report; verify baseline/clean dev; no automatic delivery. Add strict source filter/presenter and job projection contract tests first.
2. Implement shared read-contract changes, owner/auth/environment/UNKNOWN tests and pagination parity; verify no old consumer breaks. No migration initially; inspect query plans on staging-sized test DB before indexing changes.
3. Build Platform Health read-only server page using existing shell; explicit unavailable/null/unknown/disabled states, scope labels, sample/denominator, windows and investigation links. No crash health fabrication.
4. Add source-aware Search Activity using verified backend filtering; preserve product/status/date/provider/identity filters, legacy links, cursors and drill-down context.
5. Add Overview summary/navigation; retain website-only definitions, settings safeguards and existing content flows.
6. Accessibility/responsive verification: keyboard filters and menus, semantic headings/tables, visible focus, aria-current, textual statuses independent of color, polite loading/errors, retry controls, reduced-motion behavior, narrow-screen overflow and no horizontal page clipping. Use existing Playwright/admin navigation QA patterns and actual keyboard/browser review.
7. Full root/mobile tests/types/static checks/build/parity/security/Preview tests; admin role denial, DB outage, partial reader failure, UNKNOWN history, reconciliation, empty windows, null latency, filter-to-summary consistency, stale requests and link preservation. Preview worker remains sole delivery owner.

Acceptance: all required local gates green; no mocks in production totals; data source/window/scope visible; accurate backend-filtered pagination; installed-app health remains explicitly unavailable; no booking/revenue invention; no permission expansion; account/consent/cache regressions absent. Live SQL + physical-device/staging verification remains a separate documented prerequisite for release, not a reason to deploy automatically.
