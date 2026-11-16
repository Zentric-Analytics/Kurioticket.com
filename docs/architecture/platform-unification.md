# Platform unification implementation record

Baseline: dev 7041310cfb158ab285f82e04ef165f21e113bda1, clean tree and equal to origin/dev on November 15, 2026. This assignment works directly on dev by explicit user instruction, overriding the normal feature-branch workflow. No push is safe until integrated verification: the Render Preview worker owns staging and native/OTA delivery and observes dev. No release workflows or production configuration will be invoked.

## Stage 00

Web and Expo iOS/Android share Next.js APIs, PostgreSQL and Prisma. Web sessions and native bearer sessions resolve the same User; saved flights/hotels/cars/searches, recent searches, price alerts, preferences and confirmed trips use existing shared services. Accounts, sessions, optional consented visitor journeys and operational searches are distinct records.

Observed gaps: expired feature cache failures re-enable enabled defaults; native session platform metadata is not propagated consistently into operational records; support discards ios/android specificity; health returns 200 on DB failure; admin reporting has no canonical source partition; native home merchandising uses bundled data while web uses published CMS; saved mutation/refresh and preference failures can publish or cache stale optimistic state. Refresh and account-isolation paths require executable coverage.

Existing verification executed on this exact baseline: root install passed; mobile install/typecheck/2,315 tests/Android export passed; full web 4,915 passed and 71 failed; lint 55 errors and 26 warnings; build compiled/generated routes but exited on Next.js SecurityFatalError. Conflict, timestamp and current-tree secrets checks passed. Travel parity 399 passed; preview release 247 passed/4 skipped; focused admin contracts 40 passed; CMS 108 passed/4 failed. Evidence retained outside the repository in the task outputs. No live database/provider/device credentials were used. No migration or deployment was performed.

Plan: strengthen existing control evaluation without changing public boolean contracts; resolve application source from validated session context rather than headers alone; add protected bounded monitoring contracts with UNKNOWN; consume existing published CMS contracts in native layouts; strengthen refresh/optimistic mutation/account isolation. Use additive metadata and existing persistence where sufficient. No new infrastructure, external SDK, dependency or Stage 06 UI.

## Stage 01

Implemented database-verified feature evaluation. Known disabled states remain disabled during outages. Cold/missing state is blocked. Enabled critical controls require revalidation after 10 seconds; High controls tolerate up to 60 seconds since verification, Medium up to five minutes. Failed reads do not renew freshness. Each instance reads the shared database on expiry; cross-instance shutdown propagation is bounded by the 10-second cache, not instantaneous. Mutation results update the local cache and supersede in-flight reads. Initialization is environment-scoped. Existing API booleans, production authorization/reauthentication/reasons and transactionally audited mutations remain unchanged. Existing package component and price-alert service enforcement was verified. No distributed invalidation infrastructure was introduced.

Verification: 68 focused feature-control/API/price-processor/package tests passed; changed feature-control files passed ESLint. Processor tests now explicitly inject an enabled control instead of relying on outage defaults. No live database or multi-host deployment was exercised (multiple evaluator instances tested in process).

## Stage 02

Added canonical WEB/IOS/ANDROID/UNKNOWN resolution and bounded app-version validation. Native source uses the validated bearer session's platform/version, not the current header. This is authenticated session-bound attribution, not OS attestation: session creation still records a validated client declaration. Anonymous native calls and old ambiguous sessions are UNKNOWN. Website sessions and same-origin browser transport classify WEB; source never grants authorization. The existing visitor-consent and account resolution remains authoritative.

New search query metadata, provider telemetry, redirect metadata, relevant analytics/journey events and mobile support context retain source without extra behavioral events or schema changes. Existing rows are not rewritten. Support preserves authenticated ios/android and labels unverifiable guests unknown. Existing APIs remain additive/backward compatible.

Verification: 75 focused resolver/identity/search/analytics/handoff/support/terminal-history tests passed; root TypeScript check passed. Touched runtime files passed ESLint (one pre-existing hotel currency warning plus subsequently removed unused local warnings). No hardware attestation or physical-device identity verification is claimed.

## Stage 03

Added authenticated, no-store GET /api/admin/platform-operations?hours=24 (1–720). Search, handoff and provider-call aggregates partition WEB/IOS/ANDROID/UNKNOWN without joins or duplicate behavioral records. Combined counts reconcile; absent history source remains UNKNOWN. Database queries are environment scoped and bounded. Unknown/small samples are not labeled healthy. Existing provider/email/CMS/alert readers and staging release identity are reused. Native installed-app health is explicitly UNKNOWN; API health is not device health. No new platform alert occurrences are emitted without operational evidence; existing conservative alert/acknowledgment semantics remain in use.

Health now returns 503 when DB readiness fails and suppresses raw connection errors. Critical scheduler invocations record one existing ApiProviderLog row, then update its final outcome; task failures propagate and monitoring failures cannot masquerade as task success. No payload or exception content is persisted. This starts new evidence; it does not prove past cron execution, scheduler configuration or missed runs. No schema migration, new service, SDK, UI or Preview-worker change.

Verification: 34 focused monitoring/provider/alert/deletion-cron tests passed; root TypeScript and scoped lint passed. SQL environment binding and outage contracts tested with injected database; live PostgreSQL execution and scheduler deployment remain unverified.

## Stage 04

Native popular stays, adventure discovery, regional routes and the dedicated FAQ screen now consume the existing published-content APIs through a shared focus/resume loader. Native rails, dimensions, navigation and accessibility remain native; flight routes retain the existing first-eight/next-ten split. CMS IDs never become arbitrary navigation URLs; hotel canonical IDs/search values and route codes/images are validated. Favorites resolve canonical saved destinations instead of assuming CMS keys are destination IDs. Fare presentation is scoped to the current market/currency/routes to avoid stale prices after editorial changes.

Resources are keyed by market/locale (and homepage API origin), coalesce requests, preserve the server's cms/fallback source, and clear stale published data on loading/failure. Intentional empty CMS scopes stay empty. Network failure hides unavailable rails; FAQ offers retry/pull refresh. Existing server fallback policy remains authoritative. Homepage editorial scopes remain English per the existing web contract; locale-specific FAQ fallback and native interface localization remain intact. Bundled destination catalogues and app-specific promotional/presentation content remain bundled; no second CMS/publication flow or new persistence was added.

Verification: 100 native home/FAQ/parser/resource tests and 7 web CMS integration tests passed; mobile TypeScript passed. Updated the obsolete test expectation that native must remain outside CMS. No live CMS publication or physical-device visual test was performed.
