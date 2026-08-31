# Location discovery platform decision record

Status: foundation approved for incremental delivery; no live hotels or cars provider is integrated. Updated 2026-08-30.

## Product truth and current state

Kurioticket currently uses Duffel place suggestions with a 249-airport owned fallback for flights, an 83-record owned hotel destination catalogue, and an owned cars catalogue assembled from airports, cities, and 114 rental areas. Hotel and car result inventories are intentionally static. A suggestion, coordinates, or provider identifier is therefore **not evidence of availability**. Broad free-text searches remain permitted; the UI must distinguish exact static coverage, explicitly relevant broader/nearby coverage, and an honest unsupported empty state.

Recent flight and hotel searches currently share browser storage (or account storage when signed in), are capped at five, and have no TTL. Cars has a separate, capped-at-three browser helper. This inconsistency is migration input, not the target design. Public Nominatim **is not permitted for autocomplete**: its usage policy explicitly forbids client autocomplete.

The repository has PostgreSQL/Prisma and deploy-time migration tooling, but no global place index or search service. A large raw dataset must not be committed or loaded into the transactional database without measured sizing, query, backup, deployment, and cost evidence.

## Canonical contract

`CanonicalLocation` in `src/lib/locations/types.ts` is provider-neutral and retains:

- a stable Kurioticket ID and typed place (`airport`, `city`, `district`, `landmark`, `rental-area`, or `custom`);
- primary and supporting labels, country/region, optional coordinates, IATA/ICAO codes, aliases and localized terms;
- the unchanged submitted value required by existing URLs;
- explicit static-coverage metadata per product; and
- namespaced future provider IDs that never become the Kurioticket identity.

Adapters translate legacy records at boundaries. Provider adapters return both provenance and `isLiveAvailability`; static/fallback implementations must return false. UI and URLs consume canonical display/submission fields, not provider-specific shapes.

Flight read-path implementation (2026-08-30): `/api/flights/places` retains Duffel as the live place-discovery source and the existing owned airport catalogue as deterministic enrichment/fallback. Both paths now expose canonical locations alongside the unchanged legacy `suggestions` contract. Per-response provenance distinguishes live-provider enrichment from owned fallback; `isLiveAvailability` is always false because discovering a place does not prove itinerary inventory. Provider failures expose only stable recovery copy and allow-listed status categories, never raw payloads, credentials, or query text.

## Matching and result semantics

Owned-catalog matching normalizes Unicode, accents, punctuation and spacing, then ranks exact code, exact label/alias, prefix, word-prefix and substring. Typo tolerance is limited to one edit on terms and queries of at least five characters; it never fuzzes short codes. Stable catalogue order breaks ties until measured popularity exists. Locale terms are searchable but do not overwrite the selected canonical label.

Submitting arbitrary text remains valid. The results layer must classify it as:

1. exact static coverage;
2. broader/nearby static coverage only with a documented geographic or catalogue relationship; or
3. unsupported, with no fabricated inventory and a recovery action to edit or choose a suggestion.

## Recent-search policy target

Use one versioned semantic record across products with location ID, submitted value, labels, product, timestamps, and no sensitive itinerary/passenger data. Keep at most 10 entries in the unified history surface for 90 days from last use. Expiry happens on read/write; per-item removal and Clear all are available, and a “Save recent searches” control disables future writes and can offer a separate explicit deletion action. Signed-out data stays origin/browser-local; signed-in data uses the account store. Do not silently merge or delete legacy data: read legacy keys, preserve up to their existing cap, stamp migration time as `lastUsedAt`, and write the new format only after a user creates/removes a recent item. Browser eviction and private browsing can shorten retention.

Implementation note (2026-08-30): browser history uses a v2 envelope and reads the v1 key without rewriting or deleting it. Removal and Clear all create bounded tombstones/a clear timestamp so legacy records do not reappear while their source data remains recoverable. Account and device records are combined read-only for display, newest semantic identity wins, and device records are never silently uploaded at sign-in. Opt-out is device-scoped, stops writes, and hides retained data without deleting it; explicit per-item/Clear all actions are the deletion controls. The 90-day calculation uses the client clock for browser data and server clock/`updatedAt` for account data. Cars remain browser-local until the existing Prisma `SearchType` enum gains `CAR` through a separately reviewed production migration; this avoids an unauthorized database change.

## Accessibility, reliability, and observability

Comboboxes follow the WAI-ARIA pattern: labelled input, listbox ownership, active option, Escape, arrows, Enter, pointer selection and restored focus. Mobile sheets retain background lock while giving exactly one active scroll owner; keyboard/visual-viewport tests cover both directions. Empty/loading/error/offline states must be distinct.

Phase 5 acceptance gate (2026-08-30): every retained location picker must expose one labelled combobox controlling one labelled listbox, stable option IDs, active-option state, Arrow Up/Down and Enter selection, Escape/back/close behavior, launcher focus restoration, a single polite loading/result/empty announcement, visible keyboard focus, and at least a 44px pointer target. Flight and hotel mobile sheets now share this contract with the established car and desktop patterns without changing portal ownership, body locks, scroll containers, or motion. Automated source/interaction contracts are necessary but not sufficient: manual VoiceOver Safari, TalkBack Chrome, NVDA/Firefox or Chrome, 200% zoom/reflow, switch-control, and real soft-keyboard scroll testing remain release gates when those environments are available.

Static recovery uses `resolveStaticSearch`: `exact` is a known owned-catalog match, `broader` is permitted only when canonical coverage explicitly says broader and must be labelled, `unverified` permits current custom text without provider validation or inventory claims, and `unsupported` gives deterministic edit/choose-a-suggestion guidance. Hotel and car location responses expose this additive contract plus canonical locations and `isLiveAvailability: false`; flight provider/fallback behavior remains owned by its flight discovery adapter, and package adoption can consume the same helper as its static catalogue is canonicalized.

Record privacy-safe counters and timings only: product, source, latency bucket, normalized query-length bucket, result count, selected rank/kind, fallback and empty reason. Do not log raw queries, coordinates, recent entries, account identity, or provider payloads. Provider timeouts, failure ratios, fallback rates, empty rates and stale-catalog age require alerts.

The flight hook emits bounded latency/result buckets, provider status/error category, fallback/zero-result outcome, and bounded selection source/rank. It is a no-op without a configured sink, so this increment creates no new external data flow. A later operations change may bind it to an approved aggregated sink; raw queries and selected location values are intentionally absent from the event type.

## Dataset ingestion and maintenance

Approved sources are downloaded in CI or an operator job to ephemeral storage, checksum-verified, schema/license validated, normalized and deduplicated. The review artifact is a small manifest (source URL, license, retrieval/version date, checksum, counts, validation report), not a raw global dump. A generated compact serving index is published as a versioned artifact or loaded through a reviewed, reversible DB migration after capacity tests. Updates create scheduled review PRs; failures retain the last-known-good version. Rollback selects the previous manifest/index version. Attribution is rendered wherever the source license requires it.

The 249-airport flight fallback is deliberately not bulk-expanded in this PR. Safe expansion should use the documented ephemeral OurAirports ingestion path, retain only validated scheduled-service airports with stable IATA identity, publish count/checksum/license validation in a small manifest, and measure bundle/server-index size plus false-positive ranking before rollout. Until that review, retaining the known catalogue avoids a large uncontrolled data commit and ranking regression while Duffel continues to provide broader live place discovery when available.

Phase 6 implementation (2026-08-30) adds a review-only OurAirports pipeline and operator runbook. Raw downloads and generated candidate artifacts are ignored. Snapshot manifests must bind the approved HTTPS URL, Public Domain license record, immutable version/retrieval time and SHA-256 before parsing. Normalization admits scheduled-service large/medium/small airports with valid IATA, optional valid ICAO, country, coordinates and city/name; duplicate IATA identities are quarantined as ambiguous, not guessed. Coverage reports compare the current 249-airport catalogue to candidates and explicitly assert no availability claim. No output automatically replaces the deployed catalogue; promotion requires a separate small human-reviewed PR. At least three prior checksum-addressed snapshots/artifacts are retained for last-known-good rollback. Public Nominatim remains forbidden for autocomplete and is not used by this tooling.

## Phased roadmap and acceptance

1. **Foundation:** contract, normalization/ranking, legacy adapters, provider boundary, decision record and unit tests. No UI or URL behavior changes.
2. **Read path:** expose an owned-catalog service and refactor flight/hotel/car/package suggestion surfaces incrementally, with parity snapshots and existing fallback preserved.
3. **Truthful static discovery:** coverage resolver and exact/broader/unsupported result states for hotels/cars/packages.
4. **Recents:** non-destructive versioned migration, 10/90-day policy, removal/Clear all/opt-out, account/browser parity.
5. **Operations:** validated ingestion artifact, attribution, freshness dashboard and privacy-safe telemetry.
6. **Live providers:** credentialed adapters behind flags, contract tests, shadow comparison, gradual rollout and instant fallback. This requires separate user authority and credentials.

Each phase must pass focused unit tests, lint/type/build checks, desktop Chrome and Android Chrome interaction checks for affected surfaces, URL-contract fixtures, accessibility keyboard/touch checks, and static-truth assertions. Rollback is a feature-flag or prior adapter/index version; schema changes use additive-expand/migrate/contract sequencing.

## Authoritative research basis

| Source | Decision or constraint |
| --- | --- |
| [IATA Location Codes](https://www.iata.org/en/services/codes/) | IATA controls airline/location code standards; do not infer ownership or completeness from a code. |
| [IATA Airport & Location Identifier Database](https://www.iata.org/en/publications/manuals/airline-airport-location-coding-databases/airport-location-identifier-database/) | Authoritative commercial dataset is licensed; purchase requires user approval. |
| [IATA code search](https://www.iata.org/en/publications/directories/code-search/) | Useful manual verification, not bulk ingestion authority. |
| [IATA location-code fact sheet](https://www.iata.org/en/iata-repository/pressroom/fact-sheets/fact-sheet-iata-location-codes/) | Codes cover metropolitan areas as well as airports, so type and disambiguation are mandatory. |
| [ICAO API Data Service](https://www.icao.int/api-data-service) | Potential authoritative aviation source with subscription/access constraints. |
| [ICAO Doc 7910](https://store.icao.int/en/location-indicators-doc-7910) | ICAO location indicators are a separately governed/licensed reference. |
| [OurAirports data](https://ourairports.com/data/) | Nightly public-domain CSV source; validate and attribute voluntarily, retain no-warranty notice. |
| [GeoNames export](https://www.geonames.org/export/) | Daily CC-BY geographic extracts require attribution; web-service quotas preclude unplanned autocomplete load. |
| [OpenStreetMap copyright](https://www.openstreetmap.org/copyright) | ODbL attribution and share-alike analysis is required before derived database use. |
| [Public Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) | Public endpoint forbids autocomplete and imposes rate/caching/attribution requirements. |
| [Unicode normalization UAX #15](https://www.unicode.org/reports/tr15/) | Normalize consistently without treating presentation forms as distinct places. |
| [Unicode CLDR collation](https://www.unicode.org/reports/tr35/tr35-collation.html) | Locale-aware labels/search terms need versioned locale data and deterministic fallbacks. |
| [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Defines keyboard interaction and combobox/listbox semantics. |
| [WCAG 2.2 input purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose) | Inputs need programmatically identifiable purpose where applicable. |
| [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Mobile controls and clear/remove actions need adequate pointer targets. |
| [MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) | Browser storage is synchronous, origin-scoped and not account storage. |
| [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Local retention is best-effort; eviction/private modes can shorten it. |
| [UK ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Retention needs a justified period and deletion/review process. |
| [EU GDPR Article 5](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679) | Data minimization, purpose and storage limitation shape recents/telemetry. |
| [Duffel Places API](https://duffel.com/docs/api/places/schema) | Current flight provider supports city/airport suggestions, codes, coordinates and provider IDs; adapter must isolate it. |
| [Duffel testing guide](https://duffel.com/docs/api/overview/test-your-integration) | No-results, timeout, expiry and price-change cases are normal and require explicit handling. |
| [Duffel stays search](https://duffel.com/docs/guides/searching-for-stays) | Live stays search is coordinate/radius or accommodation based; suggestions alone are not availability. |
| [Booking.com Demand API](https://developers.booking.com/demand/docs/open-api/demand-api/conversations.md) | Live inventory requires credentials and provider location IDs behind an adapter. |
| [Elasticsearch fuzzy query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html) | Fuzzy expansion can be expensive/misleading; bounded edits and expansion controls are necessary. |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Exclude sensitive data and sanitize event fields while retaining operational evidence. |
| [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/) | Vendor-neutral metrics/traces allow later provider comparison without coupling. |

This research establishes constraints, not permission to ingest or redistribute licensed data. Any paid license, account, new hosted search infrastructure, or irreversible external action requires user direction.
