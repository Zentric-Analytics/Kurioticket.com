# Native KAYAK metasearch diagnosis

## Root cause

The native clients already posted Flights, Hotels, and Cars to the same public
search routes used by the website. Their selected flight airports were canonical
IATA codes, hotel selections retained `destinationId`, and car selections retained
the server catalogue value (including an airport IATA suffix when applicable).

KAYAK was nevertheless absent because it was **not part of any of those server
routes**. The website mounted `KayakMetasearchSection`, which made a second,
browser-only request to `/api/sandbox/kayak` and merged that React-context result
after the authoritative API response. React Native never mounted that web
component. The flight aggregator called only Duffel, while hotel and car
aggregators returned only static catalogue inventory. This was an architecture
split, not a native parser, filter, or card rejection.

## Correction

The three canonical server aggregators now invoke the common server-only KAYAK
provider concurrently with their existing providers, normalize it with the same
card models, deduplicate/sort the combined inventory, and classify every result
with a provider-aware `searchPolicy`. Provider failure becomes a partial warning
and never discards another provider's successful results. The regular website
pages no longer launch the second browser-only KAYAK request.

Native continues to contain no KAYAK transport or credential. Its existing API
client consumes the unified response, and its existing filtering/sorting operates
over that single returned array. KAYAK sandbox cards are explicitly labelled
simulated and not bookable.
