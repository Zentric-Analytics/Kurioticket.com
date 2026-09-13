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

## Item two — verified on staging

Release `89cf994750d3cd7f7ecb0663eaeb309531f2b03c` deployed successfully.
The ordinary Boston hotel search returned 152 sandbox offers. Regular cards show
readable amenity summaries; the first expanded result listed 64 official amenity
names instead of numeric feature IDs. One ID had no entry in KAYAK's dictionary,
and the UI explicitly reported one unavailable description rather than guessing.
The hotel browser error log and post-deployment server error query were empty.
All 3,133 local tests, type checks, lint, build and required release checks passed.
Item two is closed with the provider's missing-description limitation disclosed.
Combined filtering and the other remaining checklist items are not closed by this.

## Item three — shared filtering and sorting staging evidence

Verified on 2026-09-13 UTC. Shared result integration shipped in
`2cd133fa39ff73ab42d89258390faef403a67b08`; the filter-triggered request restart
correction shipped in `98d8cc4a12132b8c755e35c35c9729f67359e504`; vehicle-class
mapping shipped in `75e0a2e33a5404e1d40b29a13dc62b924145929d`.

- Flights: BOS–JFK, October 12–17, one adult: 346 KAYAK offers plus four Duffel
  results in one list. JetBlue selected 346; Duffel Airways selected one. Reset
  restored the combined list. Cheapest and Quickest controls worked. Server
  request logs confirmed filtering/sorting did not restart KAYAK after the fix.
- Hotels: Boston, same dates: 152 offers. Five stars selected 31; intersecting
  Pool selected 15. Property-name Hyatt selected 13. Clearing restored 152.
  Cheapest and Top rated selections worked. Boston's existing pipeline returned
  zero hotels, so this live case does not prove two populated hotel providers.
- Cars: BOS, same dates, no specific age: 116 KAYAK plus 30 catalogue estimates.
  Automatic selected 137; clear restored 146. Lowest total price interleaved
  KAYAK and catalogue offers in ascending order. Final Medium cars selected 55,
  including KAYAK cards; clearing restored 146. Unknown or unmapped provider
  capabilities do not falsely match specific filters.
- Browser error logs for the inspected tabs were empty. Sandbox labels and
  disabled real-booking paths remain. No checkout or payment was performed.
- All 3,136 local tests and full build passed; required GitHub checks passed.
  The final Render deployment was live before vehicle-type verification.

Additional corrections prevent per-person flight amounts from being compared
against party totals, unknown duration from ranking fastest, late hotel offers
from being hidden by an untouched old budget ceiling, stale hotels after failed
searches, and simulated prices from entering price-alert/nearby-fare caches.

Item three remains open after evidence reconciliation: a hotel search with both
KAYAK and catalogue results still needs live verification, and the Top rated
selection check did not prove guest-score ordering. The follow-up mapping now
preserves KAYAK guestRating and numberOfReviews in the shared review fields;
negative, missing or invalid scores remain unrated. Staging verification of this
correction is pending. The existing hotel pipeline is a static planning catalogue,
not a second live supplier API. This is not closure of items four through eight:
exhaustive data completeness,
mobile/desktop end-to-end coverage, provider failure/retry coverage, final
sandbox safeguard reconciliation, and final overall evidence remain separate.
Production and native builds were not deployed.
