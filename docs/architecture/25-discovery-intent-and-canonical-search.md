# Discovery Intent and Canonical Search

Status: authoritative product and navigation rule.

## Permanent rule

**Discovery creates intent. Search creates truth.**

Discovery surfaces own merchandising, imagery, editorial copy, ordering, a canonical destination reference, and optional source metadata. They do not own availability, pricing, provider identity, result eligibility, or hidden search context.

| Surface object | Required meaning | Navigation |
|---|---|---|
| Destination card | Interest in a canonical destination | Search form, visibly prefilled |
| Complete search card | A visible, valid request including every required field | Canonical results |
| Result card | A canonical result identity returned by the platform | Details |
| Provider offer | Canonical provider provenance and enabled action policy | Handoff permitted by `searchPolicy.action` |

## Hotels implementation

Web, iOS, and Android destination discovery opens the Hotel form with canonical destination identity and search value. No request is issued until the traveler visibly completes dates and occupancy and explicitly submits. Hotel results require destination, check-in, check-out, guests, and rooms. Incomplete results URLs are replaced by the form while preserving recoverable destination context.

The server schema and `/api/hotels/search` remain authoritative for request validity, aggregation, normalization, canonical IDs, eligibility, errors, details policy, and future provider handoff. Clients perform navigation readiness and transport/presentation safety only; they do not invent Hotel truth or filter canonically accepted inventory into a false empty state.

Current static inventory covers London, Paris, New York, and Tokyo. Discovery may represent other resolved canonical destinations without claiming current inventory. An unresolved destination fails closed at the Hotel form.

Flights, Cars, Deals, Packages, and other discovery products are future migrations and are not changed by this Hotel phase.
