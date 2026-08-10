# Mobile Explore destination editorial content

## Why this source exists

The shared Explore destination catalogue is derived from the airport catalogue and is intentionally factual: stable destination IDs, names, countries, airport mappings, search aliases, image lookup IDs and provenance. The mobile destination-details screen already supports optional summary, description and highlights fields, but the repository did not have a maintained destination-keyed editorial source for those fields.

`src/shared/destinations/exploreDestinationEditorial.ts` adds a Kurioticket-managed, platform-neutral editorial dataset so mobile can populate those existing fields now and the website can reuse the same source in a later task.

## Current rollout and Featured independence

Editorial scope is expanding toward all canonical Explore destinations. Editorial completeness is independent of Featured membership: `exploreDestinationPopularIds.ts` alone controls the destinations and maintained order shown in the default Explore landing-page section, while editorial records only enrich canonical destinations by ID.

The current incremental rollout still contains the original 25 records for these Featured destinations, with their copy and provenance unchanged:

1. `fr-paris`
2. `gb-london`
3. `us-new-york`
4. `id-bali`
5. `ng-lagos`
6. `ae-dubai`
7. `jp-tokyo`
8. `za-cape-town`
9. `it-rome`
10. `tr-istanbul`
11. `th-bangkok`
12. `es-barcelona`
13. `eg-cairo`
14. `ma-marrakesh`
15. `sg-singapore`
16. `nl-amsterdam`
17. `ca-toronto`
18. `us-los-angeles`
19. `ng-abuja`
20. `gh-accra`
21. `za-johannesburg`
22. `ke-nairobi`
23. `pt-lisbon`
24. `au-sydney`
25. `br-rio-de-janeiro`

The first reviewed Europe batch adds editorial content for 10 previously non-editorial canonical destinations without changing Featured membership or ordering:

1. `dk-copenhagen`
2. `ee-tallinn`
3. `fi-helsinki`
4. `is-reykjavik`
5. `lv-riga`
6. `lt-vilnius`
7. `no-oslo`
8. `pl-warsaw`
9. `se-stockholm`
10. `de-berlin`

The second reviewed Europe batch, verified on 2026-08-08, adds 10 more previously non-editorial canonical destinations:

1. `at-vienna`
2. `cz-prague`
3. `hu-budapest`
4. `be-brussels`
5. `ch-zurich`
6. `ch-geneva`
7. `de-munich`
8. `de-frankfurt`
9. `gr-athens`
10. `ie-dublin`

The third reviewed Europe batch, verified on 2026-08-08, adds 10 previously non-editorial canonical destinations from a geographically coherent Balkan and southeastern European group:

1. `al-tirana`
2. `ba-sarajevo`
3. `bg-sofia`
4. `hr-zagreb`
5. `gr-thessaloniki`
6. `me-podgorica`
7. `mk-skopje`
8. `ro-bucharest`
9. `rs-belgrade`
10. `si-ljubljana`

Before Batch 4 selection, the latest canonical catalogue contained these 15 European destinations without editorial content:

1. `de-cologne` — Cologne
2. `de-dusseldorf` — Düsseldorf
3. `de-hamburg` — Hamburg
4. `ua-kyiv` — Kyiv
5. `cy-larnaca` — Larnaca
6. `lu-luxembourg` — Luxembourg
7. `es-madrid` — Madrid
8. `gb-manchester` — Manchester
9. `it-milan` — Milan
10. `ru-moscow` — Moscow
11. `fr-nice` — Nice
12. `cy-paphos` — Paphos
13. `pt-porto` — Porto
14. `ru-st-petersburg` — St. Petersburg
15. `de-stuttgart` — Stuttgart

The fourth reviewed Europe batch, verified on 2026-08-10, adds this western European group of 10 previously non-editorial canonical destinations:

1. `de-cologne`
2. `de-dusseldorf`
3. `de-hamburg`
4. `de-stuttgart`
5. `lu-luxembourg`
6. `es-madrid`
7. `gb-manchester`
8. `it-milan`
9. `fr-nice`
10. `pt-porto`

Four German cities form the geographic core, joined by nearby western and southern European cities with strong official tourism, UNESCO, museum or cultural-institution coverage. The grouping leaves the two Cypriot, two Russian and one Ukrainian destinations together for the final Europe batch rather than switching regions.

After Batch 4, these five European canonical destinations remained without editorial content:

1. `ua-kyiv` — Kyiv
2. `cy-larnaca` — Larnaca
3. `ru-moscow` — Moscow
4. `cy-paphos` — Paphos
5. `ru-st-petersburg` — St. Petersburg

The final Europe Batch 5, verified on 2026-08-10, adds all five of those destinations:

1. `ua-kyiv` — Kyiv
2. `cy-larnaca` — Larnaca
3. `ru-moscow` — Moscow
4. `cy-paphos` — Paphos
5. `ru-st-petersburg` — St. Petersburg

Batch 5 brings European coverage to 52 of 52 canonical European destinations and confirms that European editorial coverage is complete. It brings the cumulative global rollout to 70 editorial destinations: the original 25, four reviewed Europe batches of 10 and the final Europe batch of five. The original 25 and Europe Batches 1–4 remain intact, while the global editorial rollout remains incomplete for regions outside Europe.

Africa Batch 1, verified on 2026-08-10, adds these 10 previously non-editorial canonical destinations:

1. `et-addis-ababa` — Addis Ababa
2. `ke-mombasa` — Mombasa
3. `tz-dar-es-salaam` — Dar es Salaam
4. `tz-zanzibar` — Zanzibar
5. `ug-entebbe` — Entebbe
6. `rw-kigali` — Kigali
7. `mg-antananarivo` — Antananarivo
8. `sc-mahe` — Mahé
9. `mu-mauritius` — Mauritius
10. `re-saint-denis` — Saint-Denis

The batch groups eastern African highland and coastal cities with western Indian Ocean islands. These destinations were selected first after catalogue inspection because their city, heritage, museum, conservation and official destination sources could support specific, durable copy while maintaining clear canonical scope. Entebbe remains separate from Kampala; Mauritius is covered at country and island scale; Mahé remains an island destination with Victoria clearly scoped within it; Zanzibar distinguishes the archipelago, Unguja and Zanzibar City's Stone Town; and Saint-Denis uses Réunion-specific context.

After Africa Batch 1, 18 of 54 canonical African destinations have editorial content and 36 remain without it. The eight existing African editorial records remain unchanged, and Europe remains complete at 52 of 52 destinations. Featured membership and ordering remain independently maintained; this batch includes no image, mobile UI, map or related-destination work.

Africa Batch 2 evaluated the six remaining North African destinations identified during catalogue inspection. The source gate, applied on 2026-08-10, produced these outcomes:

| Destination | Outcome | Rationale |
| --- | --- | --- |
| `dz-algiers` — Algiers | READY | UNESCO and an official city museum support city-specific Casbah, architectural and coastal context. |
| `ma-casablanca` — Casablanca | READY | Official regional tourism and Hassan II Mosque foundation material support durable urban, architectural and Atlantic context. |
| `sd-khartoum` — Khartoum | DEFER | Two durable, destination-specific authoritative references could not be verified without relying on unstable current institutional or visitor information. |
| `eg-sharm-el-sheikh` — Sharm El Sheikh | READY | Official Egyptian destination and protected-landscape material support Red Sea, Sinai, reef and Ras Mohammed context. |
| `ly-tripoli` — Tripoli | DEFER | Two durable, Tripoli-Libya-specific authoritative references meeting the editorial standard could not be verified. |
| `tn-tunis` — Tunis | READY | UNESCO and Tunisia's official destination organisation support precise medina, city and nearby museum context. |

The four READY destinations—Algiers, Casablanca, Sharm El Sheikh and Tunis—were added as the North Africa grouping. Khartoum and Tripoli remain valid canonical destinations without editorial content; no weaker sources or substitute destinations were used. Cumulative African coverage is now 22 of 54 destinations, leaving 32 without editorial content, while all 10 Africa Batch 1 records remain intact and Europe remains complete at 52 of 52.

Featured membership and ordering remain independent from editorial completeness. Africa Batch 2 changes no images, ExploreScreen or DestinationDetailsScreen UI, maps, search, flight or hotel behaviour, and it adds no related destinations; related-destination work remains deferred.

This list describes the current rollout, not an editorial allowlist or required editorial order. Missing editorial data leaves every other canonical destination valid, searchable and safe to open. Add future content in small reviewed batches rather than adding all remaining destinations at once.

These editorial batches do not change Featured membership or order and include no image or UI work. Africa Batch 1 includes no destination-image, ExploreScreen, DestinationDetailsScreen or other interface changes, and no map functionality. It adds no related destinations; those remain deferred until a separate recommendation policy is approved.

## Content fields

Each editorial record contains:

- `id` resolving to exactly one canonical Explore destination;
- `summary`, a single neutral sentence;
- `description`, one concise paragraph of durable destination context;
- `highlights`, three to five short factual phrases;
- `editorialProvenance`, including `source`, `sourceReferences` and `lastVerifiedAt`.

The editorial records deliberately do not populate `relatedDestinationIds`. Related destinations need a separate recommendation policy.

## Source-verification standard

Every destination must have at least two distinct, titled HTTPS source references attached to its typed record. Prefer official city, regional or national tourism organisations. Official government, municipal, UNESCO, cultural-institution or destination-management sources are also acceptable. Airport sources should only be used for airport facts, which are maintained separately.

`lastVerifiedAt` is the date Kurioticket checked the factual claims against the listed references. It does not mean the referenced organisations approved or endorsed Kurioticket wording.

## Airport facts versus editorial content

Airport-derived facts remain in the shared canonical catalogue and continue to drive search, airport handoffs, IDs, names, country data, aliases and image lookup IDs. Editorial copy remains in `exploreDestinationEditorial.ts` and is attached after airport-backed records are constructed, by stable destination ID. Airport facts must not be duplicated into or changed for editorial content. Destinations without editorial content remain valid.

## Original wording requirement

Do not copy paragraphs or close paraphrases from source websites. The source references support factual verification only; Kurioticket wording must be original, neutral and durable.

## Omitted unstable or prohibited content

Editorial records must not include flight or hotel prices, availability, discounts, travel dates, temporary events, opening hours, visa or immigration advice, safety guarantees, weather forecasts, unsupported rankings, “best” claims, fabricated facts or promotional superlatives.

## Adding future destinations

To add a future editorial destination:

1. Resolve and use the existing canonical Explore destination ID; never invent an ID or use an arbitrary string.
2. Research durable destination facts using at least two credible HTTPS references.
3. Add one typed record with summary, description, highlights and editorial provenance.
4. Keep airport facts and editorial copy separate; do not change airport mappings for copy reasons.
5. Run the shared editorial validation and destination tests.
6. Update this document only for process or scope changes; keep source references attached to the typed records.

`relatedDestinationIds` remains optional and deferred until a separate recommendation policy is approved.

The current 25 records intentionally remain in one source file to avoid a content-only reorganization and unnecessary provenance review noise. When reviewed regional batches make the file unwieldy, split it into typed regional modules with deterministic aggregation (for example, region plus canonical order); that aggregate order must not acquire Featured product semantics.

## Website integration

Website UI integration is intentionally deferred. The shared module has no React Native, Expo, storage, navigation or mobile-image dependency so website code can import it later without changing the current website destinations page.
