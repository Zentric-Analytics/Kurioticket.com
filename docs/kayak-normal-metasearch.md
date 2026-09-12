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

Local baseline: 3,121 tests and the full build passed; three additional automatic
request/cleanup/failure tests passed afterwards. Final combined validation and live
normal-form checks are pending. Production and native applications are unchanged.
