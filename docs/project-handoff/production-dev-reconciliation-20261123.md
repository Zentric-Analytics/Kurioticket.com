# Production-to-dev reconciliation evidence

## Branches and intent
Production baseline: fcb413180c4d9829a32f3c98232be1bc3e9183e3 (tree bacfe6f34e35a88a96edbb84d10f4d7206f5d7a0).
Latest incorporated dev: 98336a244ebb6b89b90386f20adcab0226fb4714.
Integration branch: integration/dev-production-sync-2026-11-23. Do not merge automatically.
No development changes are promoted to production by this PR.

## Explicit conflict ledger
The initial production merge into dev519014d resolved19files:
- pr-required-gates.yml: preserve newer dev homepage operations and web-build gates.
- carClientIdentity.test.ts: retain guest/registered operational continuity and nearby-fare tests; add production sandbox protocol/actual Android identity coverage.
- travelApi.ts: retain typed flight response and comparison endpoint; add sandboxDisplay opt-in.
- nearbyFareModel.ts: retain new fare types and production display-only inventory exclusion.
- homepage-fares/operations.test.ts: preserve dev layout checks and production provider attribution/table checks.
- cars/search/route.test.ts: retain both network observation fixture and real production policy wrapper.
- cars/search/route.ts, hotels/search/route.ts: preserve crawler denial, operational search/network evidence and production policy wrapper.
- flights/search/route.ts: keep dev shared handler; wrap customer search in production request policy. Nearby-fare request has no sandbox grant.
- mobile/v1/hotels/progressive/route.ts: preserve dev network observation and production canonical delegation.
- AdminHorizontalShell.navigation.test.ts, adminNavigation.test.ts: retain Online Users/Platforms and add Provider Management; no support-role expansion.
- AdminUsersToolbar.tsx: retain newer hydration-safe first draft guard.
- SearchDetailActivityPanel.tsx: retain always-visible dev activity panel; scope reset synchronously on changed request rather than stale removed expanded state.
- FlightResultsClient.tsx: retain scoped currency/expiry fare lifecycle and exclude sandbox inventory before fare projection.
- apiEnforcement.test.ts: retain shared handler/comparison endpoint shutdown coverage and real policy wrapper dependency.
- savedRecentService.ts: retain dev transactional deduplication/audit; reject sandbox saves before transaction.
- flightAggregator.ts: retain fare-only no-cache/expiry behavior, cache only live inventory and fail closed on cache failure.
- flightCacheActionability.test.ts: verify the combined persistence semantics.

A later dev98336a update caused one additional travelApi.ts conflict: preserve the consent-safe customerInteraction method and the production search option. No other new conflicts. Production mobile CI correction f61896ce is incorporated without application changes.

## Compatibility corrections
- Native selected-date/verified-fare memory filters display-only inventory before stripping provenance.
- Hotel search-alert correlation handles finite numeric guest/room counts; mismatches/NaN remain rejected.
- Dev online-presence synchronization uses changed-prop render scope; fixes lint without suppressing the rule.
- Source-contract tests updated for real dev state/formatting; VM fixture receives the new journeyRequestId binding and sandbox dependency. No assertions or safety tests removed.

## Local validation
- Web build PASS (before the subsequent native-only share delta, whose web TypeScript was rechecked).
- Web TypeScript PASS after current dev merge; mobile TypeScript PASS.
- Native2467/2467 PASS after share integration. New nearby-fare guards tested separately29/29 PASS.
- Initial web suite5626/5638; all12 failing cases pass in a focused123-test rerun after corrections. One filter layout case passed on rerun unchanged. Additional sandbox36/36 and journey19/19 PASS.
- Lint0errors/6warnings; Prisma schema, migration timestamp, conflict-marker and secret checks PASS.
- No migrations executed; existing dev migration remains present; production migration SQL unchanged.

CI on this exact PR remains required. The PR must stay open for separate review.
