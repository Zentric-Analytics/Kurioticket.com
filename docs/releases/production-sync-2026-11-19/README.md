# Frozen production integration candidate — 2026-11-19

Status: NOT READY FOR PRODUCTION PROMOTION. This branch is preparation only; no production mutation is authorized.

November 22 follow-up: [Provider Management implementation and operating limits](provider-management.md). This focused addition preserves the frozen baselines below; it does not authorize promotion or import newer dev changes.

November 23 follow-up: [Final cutover readiness and specific approval boundaries](final-cutover-readiness.md). Includes current read-only database/store observations, refreshed Play upload history and the bounded recovery proposal. Earlier dated findings below remain historical evidence.

## Immutable scope

- Captured at 2026-11-19T20:21:42Z.
- Frozen dev baseline: 6408f2e2f5b1ddab3c31d5093683fffb9c746675.
- Captured production main: 946ca26b76d3d182f9a049e1e8afc82ec798ec15.
- Merge base: ac5aac79754c5b37afb5bc7d741f42319f136ac0.
- Git ancestry: six main-only and 12,971 dev-only commits; 2,566 final-tree changed paths.
- Release branch: release/production-sync-2026-11-19. Later dev work must not enter implicitly.
- Staging was LIVE at the frozen baseline, deploy dep-dbvkudec6qcc739p55l0.
- Production was LIVE at captured main, deploy dep-dago4tc9v7es73b5o2d0.

## Reconciliation

Three add/add conflicts concerned the Apple association route, association helper and tests. Production-readable route/helper retained with equivalent dev behavior; Android helper and Preview coverage preserved, and simultaneous production/Preview app-ID coverage added. Production iOS Associated Domains entitlement was already present in dev. Production provisioning evidence retains profile UUID da065922-c441-4c1b-b13b-ed70d482666f; release fixture follows that evidence. No main/dev reset or force push.

The complete route/page tree delta has 115 additions and 73 modifications, no deletions. Main-to-frozen changes span unified travel, saved cars/packages, native authentication/passkeys, consent/visitor/presence tracking, admin operations/CMS, confirmed-trip callbacks, flight status, notification preferences and security hardening. Endpoint authorization/environment separation remain covered by the full suite; this is not a claim that every production integration was exercised live.

## Release corrections

- Shared admin datetime calendar used an over-escaped digit regex, disabling valid times. Correct digit matching restores selection while retaining strict hour/minute bounds and UTC clamping. Mounted regression includes invalid-hour rejection and valid-time selection.
- Product-search record draft date incorrectly started at 24h while applied scope was Today. Align defaults; mounted regression verifies same-filter Apply, authenticated GET-only requests, product isolation and exact hash bookmarks.
- Admin filter/detail lifecycle resets moved from synchronous effects to guarded committed-scope state adjustments. Async reads retain abort/stale-response protection; draft focus and explicit Apply behavior are preserved. Hash bookmarks use useSyncExternalStore.
- Explicit React imports permit existing classic-JSX SSR test loading; required children props and actual markup assertions retained.
- Stale source-contract tests updated to the captured UI's centralized navigation, shared date controls, Today defaults and correlation-preserving detail context. Authorization/data isolation assertions retained.
- Existing new presence disclosures now use English/Polish translation keys rather than hardcoded paragraphs. Disclosure meaning/revision unchanged.
- Main PRs receive existing parity/Preview gates and additional delivery-free production web, both-platform native packaging and PostgreSQL 18 CI. Browser geometry runs after production CSS generation. No credential-bearing CI or mobile publishing added.

These release-specific fixes should be considered for later dev backport only after comparing ongoing dev work.

## Validation evidence

Fresh root/mobile npm ci: passed, audits reported zero vulnerabilities. Native suite: 2,429 passed, zero failed; native typecheck passed. Production web build and production iOS/Android Metro exports passed. Release pipeline: 68 passed. Worker unit suite: 249 passed, four explicitly skipped external/database cases. Prisma validate, secret scan and workflow contract passed. Final local web suite: 5,440 passed, zero failed or skipped, including the new mounted regression. The preceding 5,437/5,439 run exposed two stale source expectations, corrected without removing behavior/security assertions. Initial exact-candidate CI passed PostgreSQL 18 migration/representative-upgrade checks, native packaging, security and existing migration gates; its web typecheck found missing result annotations in the new browser fixture, now corrected and locally typechecked. Final GitHub results must be attached to PR #6864; do not treat preparation notes as a passing remote check.

No device/store production binary validation, production provider transaction, production migration or restore has occurred. Native runtime production-0.3.2 differs from recorded production binaries' production-0.3.0; OTA compatibility is not established. A separately authorized native binary release is required, subject to signing/store evidence and cost verification.

See [production safety and promotion runbook](production-readiness.md).
