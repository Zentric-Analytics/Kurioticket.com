# Mobile Explore destination-content audit

This audit records the repository content reviewed before the mobile Explore
content model was implemented. It deliberately distinguishes destination facts
from hotel copy and generic website merchandising text.

## Existing sources

| Content | Existing source | Reuse decision |
| --- | --- | --- |
| City, country, ISO country code, airport code/name, coordinates and airport priority | `src/shared/airports/index.ts` | Canonical factual input. Cities are joined deterministically by country code and normalized city name. |
| Stable cross-platform image IDs, website image URLs, image labels and known website label aliases | `src/data/destinationImages.ts` | Reused by ID through the existing resolver; not copied into another image registry. |
| Approved bundled mobile destination images and fallback | `apps/mobile/src/features/explore/destinationMedia.ts` | Preserved as the first and final resolver tiers. |
| Curated 25-destination Explore stack | formerly `apps/mobile/src/features/flow/locationCatalogue.ts` | IDs moved unchanged to the shared content module; the mobile presentation continues to resolve these IDs. |
| Maintained inspiration/interest labels | `apps/mobile/src/features/explore/exploreData.ts` and `interestMappings.ts` | Kept as supported Explore behavior, but destination references now use stable IDs. |
| Website destination catalogue | `src/app/destinations/page.tsx` | Audited for labels, regions, generic translation keys and images. The shared model reuses the image registry rather than the page's presentation structure. |
| Hotel destination cards | `src/data/hotelDestinationCards.ts` | Audited but not treated as destination editorial content: subtitles and links describe hotel discovery, not destination facts. |

## Field coverage

All airport-backed records have an ID, name, country, country code, primary
airport code, complete airport-code list, airport names, aliases, image lookup
ID, and provenance. Records with approved local mobile media have full mobile
presentation content. Records also found in the curated website image registry
have website-curated media. Remaining records have airport facts and the bundled
fallback only.

The repository does **not** contain a maintained, destination-keyed source of
descriptions, summaries, highlights, activities, prices, dates or rankings.
Those optional fields are therefore absent from the model and detail UI. Generic
region summaries, translated card tags, image alt text, and individual hotel
descriptions were not misrepresented as destination editorial content.

## Naming and ID findings

- Airport cities did not previously have explicit destination IDs; IDs were
  derived in mobile as lower-case ISO country code plus a stable city slug.
- Denpasar is intentionally presented as **Bali**. The shared record keeps
  `id-bali` and explicit `Denpasar` and `Ngurah Rai` aliases rather than fuzzy
  matching.
- Website image labels include known variants such as **Turkey/Türkiye** and
  **Marrakech/Marrakesh**. These remain explicit aliases in the existing image
  registry and resolve to stable IDs.
- Some website-only places do not have a corresponding airport-city record, and
  many airport-backed records have no curated website or local image. Unsupported
  IDs now fail with a clear error instead of silently inventing a mapping.

## Content completeness categories

- **Full supported Explore content:** the 25 curated popular destinations have
  airport facts and approved bundled mobile imagery.
- **Partial supported content:** airport-backed destinations covered by the
  website image registry have airport facts and curated remote imagery, but no
  destination descriptions or highlights.
- **Airport and fallback only:** all other catalogue destinations have factual
  airport/search data and the existing bundled fallback image.
- **Editorial descriptions/highlights:** none. No destination is classified as
  having these fields because no genuine destination-keyed repository source
  exists.
