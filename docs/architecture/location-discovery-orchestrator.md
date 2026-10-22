# Location discovery and provider-binding audit

## Current-state diagnosis

The three legacy endpoints had different authority models. Flights attempted Duffel discovery and then used the airport catalogue; Hotels and Cars queried only owned catalogues. PR #5330 added a useful `SearchLocation` contract, but visible hotel/car discovery remained catalogue-only and `verifiedProviderValue` trusted a client-provided `verification` string.

## PR #5330 audit

| Area | Decision | Reason / change |
| --- | --- | --- |
| Portable `SearchLocation` | **KEEP + FIX** | Keep canonical identity and structured labels; add an opaque `selectionToken`. |
| Server schema | **KEEP + FIX** | Keep runtime validation, but validation is not authority. Server-held resolution now binds token, canonical ID, product, provider, expiry, and provider value. |
| Provider bindings in clients | **REPLACE** | Discovery responses remove provider IDs. Client `verified` flags are ignored by `verifiedProviderValue`. |
| Flight structured serialization | **FIX** | JSON location fields are parsed back to structured values before `flightSearchSchema` validation. Nested `legs` are not flattened into malformed scalar criteria. |
| KAYAK regular-search mapping | **FIX** | Hotel and non-IATA car locations resolve only through server-authoritative selections. No post-submit autocomplete and no `candidates[0]`. Public IATA codes retain their documented exact namespace behavior. |
| Web/native serialization | **KEEP + FIX** | The shared public shape remains portable and mobile now retains canonical selection metadata returned by the server. Provider secrets and IDs remain server-side. |

## Architecture

`discoverLocations` runs eligible provider adapters concurrently behind an independent 900 ms budget, combines their output with the owned catalogue, rejects nonmatching rows, canonicalizes by IATA or normalized real-world identity, merges provider bindings, ranks results, and emits one public list. Duffel remains the Flights adapter. The authenticated KAYAK sandbox autocomplete contract is used only when configured and only for verticals it exposes. The adapter interface is provider-neutral.

Owned catalogue entries enrich and recover discovery but never create a verified provider binding. The response's `isLiveAvailability: false` remains truthful because autocomplete is not inventory availability.

## Server-authoritative selection

Provider bindings are stored in a short-lived in-process resolution cache for 15 minutes. The browser/native client receives a random opaque token and canonical display data, but an empty `providerBindings` array. Search resolution requires the token to match the canonical ID and vertical. Missing, expired, cross-product, or tampered selections return `LOCATION_RESOLUTION_FAILED`; a valid selection without that provider returns `UNSUPPORTED_LOCATION`. In a horizontally scaled production deployment this cache must be moved to the shared encrypted cache already used for search context before the feature can be called production-ready.

## Vertical behavior

- **Flights:** existing Duffel discovery and owned fallback are preserved; public canonical rows now use opaque selection handles.
- **Hotels:** query-driven requests use the orchestrator and real KAYAK sandbox discovery when credentials/capability are available, with catalogue enrichment/fallback.
- **Cars:** pickup/drop-off use the same orchestrated contract; KAYAK IDs are accepted only from an exact server-held selection. Unverified typed recovery remains explicit.

## Evidence and limitations

`docs/evidence/location-discovery/api-matrix.json` records local responses for Flights, Hotels, and Cars for `New`, `Lon`, `Par`, `Lag`, `Los`, and `San`. It demonstrates query filtering, type/context labels, empty public provider bindings, opaque selection handles, and source failure isolation. KAYAK credentials were not present, so the evidence truthfully records only owned fallback and Duffel-unavailable behavior; it does not claim live inventory.

Rendered screenshot capture was attempted with Playwright, but the container had no browser binary and the browser CDN returned HTTP 403. No iOS Simulator, Android Emulator, BrowserStack credentials, KAYAK sandbox credentials, or deployed preview URL were available. Therefore desktop web, mobile web, iOS, Android, live-provider identity, and real-inventory acceptance remain release blockers. This change must **not** be described as production-ready and must not be deployed until those checks and a shared resolution cache are completed.
