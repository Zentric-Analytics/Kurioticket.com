# Authoritative travel pipelines

Kurioticket currently has exactly three authoritative inventory sources:

- Flights: Duffel live inventory.
- Hotels: `kurioticket-static-hotels`, a server-owned destination-relevant planning catalogue.
- Cars: `kurioticket-static-cars`, the existing server-owned global catalogue.

Deals composes those sources and is not a provider.

## Hotel policy

`POST /api/hotels/search` validates the shared search request and calls only `buildStaticHotelResults`. Recognized destinations return deterministic results from `staticHotelCatalogue.ts`; unknown destinations return an empty response. Search dates determine the number of nights and the indicative total. Guests and rooms remain part of the validated request but do not imply room availability.

The server response declares source `kurioticket-static-hotels`, `bookable: false`, and an enabled internal-details action. `/api/hotels/details` resolves from the same catalogue, with the search cache used only to preserve the selected estimate. There is no external hotel checkout.

Static hotel prices are planning estimates. No live room availability, cancellation terms, taxes, urgency, provider rate key, or guaranteed total is claimed. A separately reviewed live-provider project is required before live hotel booking is introduced.

## Client alignment

Web, mobile web, and Android all call the shared Kurioticket endpoints and consume the same normalized contract. Clients render server-owned capabilities and do not choose hotel sources.

The server owns result eligibility, inventory classification, provider policy, and
handoff actions. Client checks are limited to malformed transport data, unsafe URLs,
unsafe image locations, and impossible render states. No client may independently
redefine canonical travel result eligibility. If a canonical response contains
results but a client cannot safely render any of them, that is a contract error—not
a genuine empty search—and must be surfaced diagnostically.

Future providers enter the platform before the canonical API boundary:

`provider adapter -> normalization -> aggregator -> classification -> canonical API -> web + mobile`

Mobile must not integrate a travel provider directly.

## Environment contract

Duffel is the only travel provider requiring inventory credentials. Static hotels and cars require none. Scheduled jobs retain independent server-only secrets.
