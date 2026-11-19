# Curated Discovery and Canonical Search

Status: authoritative product and navigation rule.

## Permanent rule

**Curated discovery may create a complete exploratory search. Canonical search creates result truth.**

Discovery surfaces own merchandising, imagery, editorial copy, ordering, a canonical destination reference, and source metadata. Maintained Hotel discovery may add the shared exploratory context: check-in 28 UTC calendar days after interaction, check-out seven days later, two guests, one room, and cheapest sorting. That context is visible and editable. Discovery never owns availability, inventory, price, provider identity, or result eligibility.

| Surface object | Required meaning | Navigation |
|---|---|---|
| Curated destination card | Maintained destination plus standardized exploratory context | Canonical results |
| Incomplete historical/external context | Recoverable legitimate values only; no generated defaults | Search form |
| Complete search card | A visible, valid request including every required field | Canonical results |
| Result card | A canonical result identity returned by the platform | Details |
| Provider offer | Canonical provider provenance and enabled action policy | Handoff permitted by `searchPolicy.action` |

## Hotels implementation

Web, iOS, and Android curated Hotel discovery opens results directly with equivalent complete context generated at click/tap time. Manual Hotel search remains explicit. Complete saved/recent searches restore exact values; incomplete historical searches and malformed URLs recover to the form without synthetic dates or occupancy. Hotel results continue to require destination, check-in, check-out, guests, and rooms.

The server schema and `/api/hotels/search` remain authoritative for request validity, aggregation, normalization, canonical IDs, eligibility, errors, details policy, and future provider handoff. Clients perform navigation readiness and transport/presentation safety only; they do not invent Hotel truth or filter canonically accepted inventory into a false empty state.

Current static inventory covers London, Paris, New York, and Tokyo. Curated discovery may represent other maintained destinations without claiming inventory; canonical search may truthfully return zero. Canonical IDs are preserved when known and never fabricated for textual destinations.

Flights, Cars, Deals, Packages, and other discovery products are future migrations and are not changed by this Hotel phase.
