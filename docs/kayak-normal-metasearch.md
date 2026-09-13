# Additive KAYAK staging search

The user clarified that ordinary staging flight, hotel and car searches must query
KAYAK alongside existing sources, not switch to a KAYAK-only provider route.

The normal results pages now retain their existing components and add an automatic,
independently loading KAYAK provider section behind the existing server-side staging
gate. The regular routes do not require `provider=kayak-sandbox` or a second search
click. Provider failures and empty results remain scoped to the KAYAK section.

Existing sources are Duffel for flights and Kurioticket's static planning catalogues
for hotels/cars. These static sources are not represented as newly integrated live
suppliers. Simulated KAYAK offers are separated and explicitly USD/not bookable;
they do not enter live offer caches, ranking, checkout, accounts, or payment flows.

Hotel destinations resolve through KAYAK autocomplete. A unique or exact match is
used; ambiguity requires explicit selection instead of guessing a different city.
Unsupported occupancy or flight options are reported only for KAYAK. Airport car
labels are normalized to their explicit IATA code, and selected rental times are
preserved in the upstream request. Different-location rentals remain unsupported
by this sandbox adapter rather than silently becoming same-location rentals.

Final local validation: 3,124 tests passed, type checking and the full build passed,
and lint reported zero errors (68 existing warnings). Dependency audit: zero known
vulnerabilities in this release dependency tree.

## Staging verification — September 12, 2026

Release `6f539bd56d0940bcc1ee122a8ad3fb93177a02a0` is live. Ordinary forms were
submitted without a sandbox-provider query parameter for October 12–17:

- Flights BOS–JFK returned 355 KAYAK simulated offers alongside existing flight
  results and filters. Browser error log was empty.
- Hotels Boston required explicit selection of Boston, Massachusetts (the term is
  ambiguous), then returned 40 KAYAK simulated offers. The existing catalogue
  section remained present (zero Boston matches). Browser error log was empty.
- Cars BOS at 10:00 returned 116 KAYAK simulated offers after reload; the existing
  30 planning-catalogue results remained present. However, a React hydration text
  mismatch was recorded both on entry and reload. This remains an open browser
  defect; do not describe the combined normal-search verification as fully clean.

The car rendering mismatch was not reproduced in the initial local development
check, including saving JP/JPY and reloading. No speculative correction was applied.
Provider results are separate labelled sections, not a unified live ranking grid.
Production and native applications are unchanged.

## Shared-card correction (local)

The plain panel did not meet the expected presentation. KAYAK now uses FlightCard,
HotelCard, and CarResultCard locally, retaining the sandbox restriction and an
expandable customer-detail section. Hotel image options/all rates are requested;
supplier hotel/car images, flight legs, carrier logos and operating disclosures are
preserved. Safe media allowlists exclude credential-bearing/detail API URLs.
Unknown car specifications override legacy required fields in the shared display;
sandbox saving is disabled. No invented fare benefits or classification stars.

All 3,129 tests, type checks, focused lint and the full build passed. Actual shared
card/image staging verification remains pending. This does not yet unify provider
sorting/filtering and must not be described as a complete metasearch release.

### Shared-card staging observations

Release `aa0c19725343708b57549f5a8ec31b53a2f12e05` is live. The ordinary Boston
hotel search returned 152 sandbox offers using the regular HotelCard. The first
visible images loaded successfully: KAYAK supplies its "Not available in Sandbox"
placeholder for these records, not actual property photographs. Car cards show
supplied vehicle images, and flight cards show the supplied itinerary layout.
The remaining car provider-label and explicit country/currency initialization
corrections are local; their staging verification is pending. Combined provider
sorting/filtering remains separate and is not covered by these observations.

Follow-up local validation: 3,130 tests passed, focused lint and type checking
passed, and the full build completed. Expanded hotel details currently show numeric
feature identifiers; readable amenity mapping still needs the provider's static
dictionary. Do not mistake identifiers for user-facing amenity names. The car
browser recorded a hydration mismatch on the shared-card staging release; the
local preference seed change is not yet verified as resolving it.

### Preference correction staging check

Release `5d8246664cc112b14f05b44748d096f700d09cc8` is live. A fresh browser tab
loaded 116 KAYAK car offers, then reloaded successfully; the fresh tab's error log
remained empty. KAYAK/Sandbox labels, supplied specifications, and saved JPY
selection were visible. Earlier error entries on the retained tab predated this
fresh verification and must not be treated as new errors. Mobile and the remaining
combined-provider checks are still open.
