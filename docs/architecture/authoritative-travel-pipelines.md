# Authoritative travel-search architecture

## Decision and audit scope

This inventory records the repository-wide audit completed before consolidation. Runtime reachability was established from Next App Router page/route exports, Expo Router files and layouts, and imports from those roots. The authoritative sources are Duffel flights, Hotelbeds hotels, and the Kurioticket static car catalogue. Deals is a consumer, not a provider.

## File classification inventory

| Classification | Files and responsibility |
|---|---|
| AUTHORITATIVE PRODUCTION | `src/app/api/{flights,hotels,cars}/search/route.ts`; `src/services/travel/{flightAggregator,hotelAggregator,carAggregator}.ts`; `src/services/travel/providers/{duffelProvider,hotelbedsProvider}.ts`; `src/services/travel/{staticCarCatalogue,staticCarResults}.ts`; product results/detail pages and active result clients under `src/app/{flights,hotels,cars,deals}` and `src/components/results`; Expo product/result routes and `TravelResultsScreen.tsx`. |
| SHARED INFRASTRUCTURE | `src/lib/travel/searchContract.ts`, validation, currency exchange, search cache, saved-result/alert services, rate limiting, analytics, `apps/mobile/src/api/travelApi.ts`, and search form models. |
| ACTIVE BUT CONFLICTING | Before this change: provider-selection branches in the flight/hotel aggregators and `hotelProvider.ts`; fallback generators; hotel discovery/demo injection; configurable car modes; client `mode`/`isDemo` eligibility; Deals live-mode gating. All were replaced or deleted. |
| TEST-ONLY | `*.test.ts` travel, route, card, form, currency, details, and package tests. Fixtures remain inside test files only. |
| OBSOLETE AND SAFE TO DELETE | Alternate Amadeus/Kiwi/Travelpayouts/Google Places runtime adapters; hotel demo catalogue/results; generic hotel selector; fallback flight/hotel data; inactive native `HomeScreen` search implementation and its private components. |
| REQUIRES RUNTIME VERIFICATION | Credentialed Duffel and Hotelbeds searches, controlled provider handoff, Android device linking, desktop/mobile-browser rendering. |
| REQUIRES MIGRATION OR DEPLOYMENT REVIEW | `.env.example`, `render.yaml`, provider health/admin presentation. No database migration or persisted-data deletion is required. |

## Active route map

- Web flights: search forms (`SearchTabs` / `StandaloneFlightSearchForm`) → `/flights/results` → `FlightResultsClient` → `POST /api/flights/search` → `searchFlights` → `searchDuffelFlights` → `normalizeFlightResult` → `TravelSearchResponse` → `FlightCard` → `/flights/details/[id]` → cached result and controlled handoff.
- Web hotels: hotel forms → `/hotels/results` → `HotelResultsClient` → `POST /api/hotels/search` → `searchHotels` → `searchHotelbedsHotels` → `normalizeHotelResult` → shared response → `HotelCard` → `/hotels/details/[id]` → cached provider result/handoff.
- Web cars: car form → `/cars/results` → `CarsResultsClient` and `POST /api/cars/search` → `searchCars` → `buildStaticCarResults` → shared response → `CarResultCard` → `/cars/details/[id]`. There is no external checkout.
- Web Deals: `DealsSearchForm` → `/deals/results` → `DealsResultsClient` → the same three product endpoints → `buildDealsPackageCandidates` → package cards/trip plan → each product's internal details path.
- Native flights/hotels/cars: active `HomeFlowScreen` and product form route → `/flight-results`, `/hotel-results`, or `/car-results` → `TravelResultsScreen` → `travelApi` → the same server endpoint and contract → `searchPolicy.action`. Native does not construct provider URLs.
- Native Deals: `/deals` exports `DealsScreen`; it is currently a navigation/search hub, not a separate inventory implementation.

## Conflicting implementation decisions

| Deleted path/symbol | Reachability and purpose | Replacement |
|---|---|---|
| `fallbackData.ts` (`fallbackFlights`, `fallbackHotels`) | Production-importable synthetic inventory used when providers failed. | Controlled `unavailable`/`empty` Duffel and Hotelbeds responses. |
| `demoHotelCatalog.ts`, `demoHotelResults.ts`, `buildDemoHotelResults` | Production-importable illustrative hotel inventory selected by an environment mode. | Hotelbeds only. |
| `hotelProvider.ts`, Google Places hotel adapter | Runtime provider selection and editorial/discovery search results. | Direct Hotelbeds adapter call. |
| Amadeus, Kiwi, Travelpayouts adapters/auth | Alternate or affiliate flight/provider paths, some otherwise dead. | Direct Duffel adapter and internal details action. |
| `demoCarCatalog`, `buildDemoCarResults`, `isDemo` | Approved catalogue with development terminology. | `staticCarCatalogue`, `buildStaticCarResults`, `inventorySource`. |
| `FLIGHT_PROVIDER_PRIMARY`, `HOTEL_PROVIDER_PRIMARY`, `HOTEL_RESULTS_MODE`, `CARS_RESULTS_MODE`, development fallback and alternate-provider variables | Obsolete policy switches or credentials. | Fixed server-owned policy plus Duffel/Hotelbeds credentials and modes only. |
| inactive mobile `features/home/HomeScreen` flow | Not imported by Expo routes; contained unavailable placeholder behavior. | Active `(tabs)/index.tsx` → `HomeFlowScreen`. |

## Contract and failure semantics

Every response has `results`, `status`, `source`, `warnings`, `partial`, and `requestId`. Every result has a policy with the closed source union, truthful `bookable`, and a discriminated action. Duffel and Hotelbeds results use internal details actions and provider-backed semantics. Static cars are non-bookable but internally actionable. Missing credentials/provider errors return `unavailable`; successful zero-result searches return `empty`; neither path fabricates inventory.

## Deployment and security

Only server-side `DUFFEL_API_KEY`, `HOTELBEDS_API_KEY`, and `HOTELBEDS_SECRET` credentials remain. Production uses live API modes and the live Hotelbeds base URL. No credential uses a `NEXT_PUBLIC_` prefix. The car catalogue requires no secret. Provider diagnostics remain in server/admin facilities.
