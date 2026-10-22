# Issue #5327 production-search evidence log

Date: 2026-09-13. Baseline: local checkout `0471878` (branch supplied as
`work`; no `dev` ref or Git remote was present). This log intentionally separates
implemented contracts from evidence that requires credentials or a deployed test
environment. An automated pass is not production-readiness evidence.

## Fresh diagnosis

The existing ordinary results architecture is not a production metasearch. Duffel
is the sole server-side flight supplier. Hotels and cars return deterministic static
catalogues. Separately, `KayakMetasearchClient` starts a browser request to the
sandbox route and merges its eventual result into client state. Although the UI now
hides results behind both loaders, this remains two payloads and two independent
lifecycles rather than a server completion barrier. KAYAK location resolution is
isolated in `kayakRegularSearch`; hotel ambiguity fails closed, while car free text
currently selects the first provider suggestion. The static hotel/car entries are
still displayed beside sandbox offers and can look like availability.

The correction in this change establishes the provider-neutral server contract that
all three vertical migrations must use: immutable provider adapters, exact
provider-location bindings, concurrent execution, per-provider and whole-search
deadlines, a single completion barrier, normalization, deduplication, ranking and
terminal no-inventory/unavailable states. It does **not** pretend the existing page
routes have already migrated to that contract.

## Acceptance evidence

| # | Requirement | Implementation / automated evidence | Browser or staging evidence | Status |
|---|---|---|---|---|
| 1 | Provider-backed discovery | Adapter-neutral resolved locations accept provider bindings; existing discovery/KAYAK tests remain applicable. | No credentialed discovery run in this checkout. | **OPEN** |
| 2 | Correct provider-specific IDs | `requireProviderBinding` permits exactly one non-empty binding; coordinator passes a provider-specific map. Unit test covers missing/duplicate bindings. | Not exercised against real providers. | **OPEN** |
| 3 | Explicit ambiguity handling | `LocationResolution` represents `ambiguous` with explicit choices rather than guessing. | Ordinary forms have not migrated to this response. | **OPEN** |
| 4 | All enabled providers concurrent | Coordinator creates all tasks before awaiting the barrier; test proves both complete. | Existing ordinary pages still use separate pipelines. | **OPEN** |
| 5 | Bounded completion barrier | Per-provider and overall deadlines abort work; timeout test covers containment. | No staging timing trace for the new coordinator. | **OPEN** |
| 6 | Normalize provider data | Every adapter owns a `normalize` boundary; invalid normalized records are dropped in test. | Provider field completeness not reverified. | **OPEN** |
| 7 | Deduplicate once | Provider-neutral key runs after all successful responses; collision covered by unit test. | No mixed live-provider browser sample. | **OPEN** |
| 8 | Unified ranking/filter/sort | One comparator ranks the completed, deduplicated array. Existing UI filters are not yet moved server-side. | Existing staging notes cover client filtering only. | **OPEN** |
| 9 | One completed payload / initial render | Return value and result arrays are frozen and no append callback exists. | Ordinary routes still fetch KAYAK separately in the browser. | **OPEN** |
| 10 | No catalogue as live availability | Diagnosis identifies static hotel/car pipelines as non-compliant. They were not deleted because no replacement live provider is configured. | Existing pages still show planning catalogue entries. | **OPEN** |
| 11 | Failure and timeout degradation | Failed and timed-out providers produce safe terminal statuses while successful inventory survives; errors are redacted. | Real provider failure/retry run not available. | **OPEN** |
| 12 | Truthful empty state | `no-inventory` requires at least one successful empty provider; total failure is `unavailable`. Both are tested. | Ordinary UI has not consumed these states. | **OPEN** |
| 13 | Flights, Hotels and Cars parity | Vertical type admits exactly the three products and adapter contract is common. | Flight/hotel/car routes have not migrated. | **OPEN** |
| 14 | Isolated KAYAK sandbox and safeguards | Existing fixed sandbox host, server-only secret, no-store/noindex, safe click-out and production-host gate were left unchanged. Secret scan is required below. | Actual sandbox verification unavailable without key/network/browser target. | **OPEN** |
| 15 | Metasearch handoff only; no booking/payment | Coordinator contains no checkout, booking or payment operation; existing sandbox click-out boundary is unchanged. | No booking/payment was attempted. | **PROVEN (code boundary)** |

## Release blockers

Do not describe Issue #5327 as complete or production-ready. The ordinary web and
mobile/API flows must be migrated to one server-owned coordinator; static planning
inventory must be removed from availability results; every enabled real provider
needs documented adapters and bindings; and credentialed KAYAK sandbox browser
checks for flights, hotels and cars must be captured after deployment. Production
must remain untouched and Kurioticket must remain external-handoff only.
