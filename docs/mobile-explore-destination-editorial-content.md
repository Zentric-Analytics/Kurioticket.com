# Mobile Explore destination editorial content

## Why this source exists

The shared Explore destination catalogue is derived from the airport catalogue and is intentionally factual: stable destination IDs, names, countries, airport mappings, search aliases, image lookup IDs and provenance. The mobile destination-details screen already supports optional summary, description and highlights fields, but the repository did not have a maintained destination-keyed editorial source for those fields.

`src/shared/destinations/exploreDestinationEditorial.ts` adds a Kurioticket-managed, platform-neutral editorial dataset so mobile can populate those existing fields now and the website can reuse the same source in a later task.

## Covered destination IDs

The dataset covers exactly the curated popular Explore destinations, in the maintained order:

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

Do not add non-curated catalogue destinations to this first editorial set.

## Content fields

Each editorial record contains:

- `id` matching one curated popular Explore destination ID;
- `summary`, a single neutral sentence;
- `description`, one concise paragraph of durable destination context;
- `highlights`, three to five short factual phrases;
- `editorialProvenance`, including `source`, `sourceReferences` and `lastVerifiedAt`.

The editorial records deliberately do not populate `relatedDestinationIds`. Related destinations need a separate recommendation policy.

## Source-verification standard

Every destination must have at least two HTTPS source references attached to its typed record. Prefer official city, regional or national tourism organisations. Official government, municipal, UNESCO, cultural-institution or destination-management sources are also acceptable. Airport sources should only be used for airport facts, which are maintained separately.

`lastVerifiedAt` is the date Kurioticket checked the factual claims against the listed references. It does not mean the referenced organisations approved or endorsed Kurioticket wording.

## Airport facts versus editorial content

Airport-derived facts remain in `exploreDestinationContent.ts` and continue to drive search, airport handoffs, IDs, names, country data and image lookup IDs. Editorial copy remains in `exploreDestinationEditorial.ts` and is attached after airport-backed records are constructed, by stable destination ID. Non-curated catalogue destinations remain valid without editorial fields.

## Original wording requirement

Do not copy paragraphs or close paraphrases from source websites. The source references support factual verification only; Kurioticket wording must be original, neutral and durable.

## Omitted unstable or prohibited content

Editorial records must not include flight or hotel prices, availability, discounts, travel dates, temporary events, opening hours, visa or immigration advice, safety guarantees, weather forecasts, unsupported rankings, “best” claims, fabricated facts or promotional superlatives.

## Adding future destinations

To add a future editorial destination:

1. Confirm the destination ID is intentionally part of the curated editorial scope.
2. Research durable destination facts using at least two credible HTTPS references.
3. Add one typed record with summary, description, highlights and editorial provenance.
4. Keep airport facts and editorial copy separate; do not change airport mappings for copy reasons.
5. Run the shared editorial validation and destination tests.
6. Update this document only for process or scope changes; keep source references attached to the typed records.

## Website integration

Website UI integration is intentionally deferred. The shared module has no React Native, Expo, storage, navigation or mobile-image dependency so website code can import it later without changing the current website destinations page.
