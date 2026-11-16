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
