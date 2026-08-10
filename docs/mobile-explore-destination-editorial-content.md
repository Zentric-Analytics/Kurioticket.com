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

Africa Batch 3, verified on 2026-08-10, adds this Southern Africa grouping of six previously non-editorial canonical destinations:

1. `za-durban` — Durban
2. `bw-gaborone` — Gaborone
3. `zw-harare` — Harare
4. `zm-lusaka` — Lusaka
5. `mz-maputo` — Maputo
6. `na-windhoek` — Windhoek

The grouping keeps each record at city scale: Durban and Maputo retain their distinct Indian Ocean and port-city settings, while Gaborone, Harare, Lusaka and Windhoek are grounded in their own civic, museum, landscape and urban-history contexts rather than country-wide safari or nature material. Sources were checked against official tourism, government, municipal, museum, archive and cultural-institution material.

After Africa Batch 3, cumulative African coverage is 28 of 54 canonical destinations, leaving 26 without editorial content. Africa Batches 1 and 2 remain intact, Khartoum and Tripoli continue to be deferred as canonical destinations without editorial content, and Europe remains complete at 52 of 52 destinations.

Africa Batch 3 includes no image, ExploreScreen or DestinationDetailsScreen UI, map, search, flight, hotel or related-destination work. Featured membership and ordering remain unchanged and independent from editorial completeness.

Africa Batch 4, verified on 2026-08-10, applies the authoritative-source gate to the Atlantic West Africa grouping. Nine READY destinations were implemented:

1. `ci-abidjan` — Abidjan
2. `gm-banjul` — Banjul
3. `bj-cotonou` — Cotonou
4. `sn-dakar` — Dakar
5. `ng-enugu` — Enugu
6. `sl-freetown` — Freetown
7. `tg-lome` — Lomé
8. `lr-monrovia` — Monrovia
9. `ng-port-harcourt` — Port Harcourt

`gn-conakry` — Conakry remains deferred pending stronger destination-specific authoritative provenance. It remains a canonical, searchable destination without editorial or partial enrichment, and no substitute destination was added.

The batch uses official national and state tourism, government, museum, cultural-authority and UNESCO material. Copy remains scoped to each canonical city: offshore Gorée retains its correct relationship to Dakar, Banjul is not expanded to Greater Banjul, and country- or state-wide attractions are not presented as sites within Cotonou, Enugu, Lomé or Port Harcourt.

After Africa Batch 4, cumulative African coverage is 37 of 54 canonical destinations, leaving 17 without editorial content. Africa Batches 1–3 remain intact; Khartoum, Tripoli and Conakry continue as documented deferrals; and Europe remains complete at 52 of 52 destinations.

Africa Batch 4 changes no images, ExploreScreen or DestinationDetailsScreen UI, maps, search, flight or hotel behaviour, or related destinations. Featured membership and ordering remain unchanged and independent from editorial completeness.

Africa Batch 5, verified on 2026-08-10, covers the planned inland West Africa and Central Africa grouping. All 10 candidates passed the provenance gate and were implemented:

1. `ml-bamako` — Bamako
2. `ng-kano` — Kano
3. `ne-niamey` — Niamey
4. `bf-ouagadougou` — Ouagadougou
5. `cg-brazzaville` — Brazzaville
6. `cm-douala` — Douala
7. `cd-kinshasa` — Kinshasa
8. `ga-libreville` — Libreville
9. `ao-luanda` — Luanda
10. `cm-yaounde` — Yaoundé

No Batch 5 candidate was deferred. Sources were selected from durable reference works and official UNESCO, museum, government and cultural-institution sites, with two distinct titled HTTPS references retained on every record. City copy keeps Bamako and Niamey anchored to their Niger River settings, separates Kano and Ouagadougou from country-wide claims, distinguishes Brazzaville from Kinshasa and Douala from Yaoundé, and treats Libreville and Luanda as their specific estuary and Atlantic capitals.

After Africa Batch 5, cumulative African coverage is 47 of 54 canonical destinations, leaving 7 without editorial content. Conakry, Khartoum and Tripoli continue as documented canonical deferrals, Africa Batches 1–4 remain intact, and Europe remains complete at 52 of 52 destinations.

Africa Batch 5 changes no images, ExploreScreen or DestinationDetailsScreen UI, maps, search, flight or hotel behaviour, booking flows, or related destinations. Featured membership and ordering remain unchanged and independent from editorial completeness.

Africa Batch 6, verified on 2026-08-10, evaluated the four remaining candidates not subject to an earlier source-gate deferral. All four were implemented as a Horn of Africa and Great Lakes grouping:

1. `bi-bujumbura` — Bujumbura
2. `dj-djibouti` — Djibouti
3. `so-hargeisa` — Hargeisa
4. `ss-juba` — Juba

No Batch 6 candidate was deferred. Each record uses two distinct, titled HTTPS references selected from durable institutional or reference sources. Copy keeps Bujumbura at city and Lake Tanganyika scale, distinguishes Djibouti City from the Republic of Djibouti, limits Juba to its White Nile urban setting, and describes Hargeisa neutrally as Somaliland's administrative centre while preserving the canonical `so-hargeisa` country assignment to Somalia.

After Africa Batch 6, cumulative African coverage is 51 of 54 canonical destinations, leaving 3 without editorial content. Those three are the continuing documented source-gate deferrals: `gn-conakry` — Conakry, `sd-khartoum` — Khartoum and `ly-tripoli` — Tripoli. Africa Batches 1–5 remain intact, and Europe remains complete at 52 of 52 destinations.

Africa Batch 6 changes no images, ExploreScreen or DestinationDetailsScreen UI, galleries, maps, search, flight or hotel behaviour, booking flows, or related destinations. Featured membership and ordering remain unchanged and independently maintained.

### Final Africa batch

The final Africa batch, verified on 2026-08-10, implements the three canonical destinations that had been temporarily deferred while stronger source resolution was completed:

1. `gn-conakry` — Conakry
2. `sd-khartoum` — Khartoum
3. `ly-tripoli` — Tripoli

The separate source-resolution pass supplied exact, pre-verified authoritative references, which were represented directly in editorial provenance without substituting or inventing URLs. Conakry uses official Guinea Ministry of Culture material about the national museum and Sandervalia cultural context. Khartoum uses UNESCO material only for durable geography, archaeological collections and institutional history; its copy makes no claim that the Sudan National Museum is currently open, intact, accessible or operating. Tripoli is explicitly disambiguated as Tripoli, Libya, and its UNESCO references and copy concern Libya rather than Tripoli, Lebanon; the record does not describe Tripoli itself as a UNESCO World Heritage Site.

The three temporary deferrals are removed because all three destinations now have complete editorial records. Repository-derived coverage is **54 of 54 canonical African destinations editorialized**, with **0 remaining**. Here, 54/54 means every canonical African destination currently represented by the Explore catalogue has editorial enrichment; it does not imply that the catalogue represents every possible destination in Africa. Europe remains complete at 52 of 52 destinations, and Featured membership and ordering remain independent and unchanged.

### Asia Batch 1 — East Asia

Asia Batch 1, verified on 2026-08-10, adds editorial content for exactly these 10 previously non-editorial canonical destinations:

- `cn-beijing` — Beijing, China
- `cn-guangzhou` — Guangzhou, China
- `hk-hong-kong` — Hong Kong, Hong Kong SAR China
- `mo-macau` — Macau, Macao SAR China
- `jp-osaka` — Osaka, Japan
- `kr-seoul` — Seoul, South Korea
- `cn-shanghai` — Shanghai, China
- `cn-shenzhen` — Shenzhen, China
- `tw-taipei` — Taipei, Taiwan
- `mn-ulaanbaatar` — Ulaanbaatar, Mongolia

The batch represents a separate authoritative-source research pass using exact, pre-verified UNESCO, municipal or national tourism, museum and cultural-institution references. Each record carries at least two distinct titled HTTPS references and durable, destination-specific claims; no fallback URL was invented or substituted. Hong Kong retains the country label `Hong Kong SAR China`, while destination `Macau` retains the distinct country label `Macao SAR China`. Taipei remains `Taipei, Taiwan`, with neutral cultural and geographic treatment and no political-status commentary.

Airport-backed scope and identity remain separate from editorial copy. Seoul retains its GMP/ICN grouping without treating Incheon as part of Seoul, and Osaka remains scoped to Osaka rather than Kyoto, Nara, Kobe or wider Kansai attractions; KIX's airport mapping does not broaden the editorial record. Beijing's PEK/PKX grouping and all other canonical names, countries, airports, aliases, image identities and provenance remain unchanged.

Repository-derived Asian coverage moves from **5 of 64** canonical destinations before the batch to **15 of 64** after it, leaving **49** Asian destinations without editorial enrichment. Europe remains complete at **52 of 52**, and Africa remains complete at **54 of 54**. Featured membership and ordering remain independently maintained and unchanged.

This implementation includes no ExploreScreen or DestinationDetailsScreen UI work, image or gallery work, map work, search changes, flight or hotel booking changes, related-destination work, or editorial architecture split. The shared editorial module remains intact for a later dedicated refactor.

### Asia Batch 2 — Mainland Southeast Asia

Asia Batch 2, verified on 2026-08-10, considered and implemented all seven candidates, with no deferrals:

- `vn-hanoi` — Hanoi, Vietnam
- `vn-ho-chi-minh-city` — Ho Chi Minh City, Vietnam
- `kh-phnom-penh` — Phnom Penh, Cambodia
- `kh-siem-reap` — Siem Reap, Cambodia
- `th-phuket` — Phuket, Thailand
- `la-vientiane` — Vientiane, Laos
- `mm-yangon` — Yangon, Myanmar (Burma)

The research pass uses durable facts supported by national tourism authorities, UNESCO, official museums, heritage authorities and public cultural institutions. Every record carries at least two distinct titled HTTPS references, checked on the verification date; restricted external HTTPS access in the implementation environment did not become a reason to defer otherwise supportable records.

Canonical and geographic scope remains deliberate. `Ho Chi Minh City` stays the canonical name, with `Saigon` used only for historical context. Siem Reap is described as the city and a gateway to the nearby Angkor archaeological landscape, not as though every Angkor monument stands within the city. Phuket retains the catalogue's broader island-destination scope, including province-wide coastlines and communities alongside Phuket City's historic town. Vientiane means the capital city in this editorial record, rather than the wider prefecture or a province.

Yangon retains the country label `Myanmar (Burma)` and uses neutral, evergreen river, religious, architectural, market and museum context. Its copy makes no claims about current safety, political control, demonstrations, borders, transport, airport operations, museum opening, accessibility or tourism normality. Phnom Penh and Siem Reap also retain their repository airport facts unchanged; editorial research does not revise operational airport data.

Repository-derived Asian coverage moves from **15 of 64** canonical destinations before the batch to **22 of 64** after it, leaving **42** without editorial enrichment. Europe remains complete at **52 of 52**, and Africa remains complete at **54 of 54**. Asia Batch 1 and the original 25 records remain intact, while Featured membership and ordering remain independently maintained and unchanged.

This batch includes no UI, image, gallery, map, search, flight, hotel, booking, related-destination or editorial-architecture changes. It changes only shared editorial content, focused regression tests and this rollout documentation.

This final batch includes no image work, ExploreScreen or DestinationDetailsScreen UI work, galleries, maps, search changes, flight or hotel changes, booking changes, or related-destination work.

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
