import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsPage = readFileSync("src/app/hotels/results/page.tsx", "utf8");
const resultsClient = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
const searchBar = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");
const searchRoute = readFileSync("src/app/api/hotels/search/route.ts", "utf8");
const aggregator = readFileSync("src/services/travel/hotelAggregator.ts", "utf8");
const detailsPage = readFileSync("src/app/hotels/details/[id]/page.tsx", "utf8");
const detailsClient = readFileSync("src/components/results/HotelDetailsClient.tsx", "utf8");
const sandboxSearch = readFileSync("src/app/sandbox/kayak/search.tsx", "utf8");

test("sandbox Hotel results use the canonical Hotel results shell", () => {
  assert.match(resultsPage, /const sandboxProviderMode = first\(query\.provider\) === "kayak-sandbox"/);
  assert.match(resultsPage, /<HotelResultsClient \/>/);
  assert.doesNotMatch(resultsPage, /KayakSandboxResults|adaptKayakHotelSearch/);

  assert.match(resultsClient, /provider:\s*params\.get\("provider"\) === "kayak-sandbox"/);
  assert.match(resultsClient, /fetch\(providerMode \? "\/api\/hotels\/search\?provider=kayak-sandbox" : "\/api\/hotels\/search"/);
  assert.match(resultsClient, /return <HotelCard key=\{hotel\.id\}/);
  assert.doesNotMatch(resultsClient, /useKayakResults|KayakResultCard|kayakHotelCardModel|kayak\.offers/);
  assert.doesNotMatch(resultsClient, /\/sandbox\/kayak\/details/);
});

test("provider-only Hotel search still uses the canonical server search and details cache", () => {
  assert.match(searchRoute, /searchHotelsByProvider\(parsed\.data, providerMode/);
  assert.match(searchRoute, /source: providerMode \|\| classified\.source/);
  assert.match(aggregator, /export async function searchHotelsByProvider/);
  assert.match(aggregator, /rememberProviderResults\("hotel", results, search\)/);
  assert.match(aggregator, /rememberHotelSearchCohort\(results, search\)/);
  assert.match(aggregator, /rememberHotels\(results, search\)/);
});

test("Hotel provider mode survives edit search and Results to Details navigation", () => {
  assert.match(searchBar, /searchParams\.get\("provider"\)/);
  assert.match(searchBar, /params\.set\("provider", providerMode\)/);
  assert.match(resultsClient, /\.\.\.\(providerMode \? \{ provider: providerMode \} : \{\}\)/);
  assert.match(detailsPage, /getFirstSearchParam\(query\.provider\) === "kayak-sandbox"/);
  assert.match(detailsClient, /provider: searchContext\?\.provider/);
});

test("sandbox Hotel entry provides a display destination while retaining provider destination id", () => {
  assert.match(sandboxSearch, /const \[destinationLabel, setDestinationLabel\] = useState\(""/);
  assert.match(sandboxSearch, /destinationId: destination, destination: destinationLabel \|\| "KAYAK sandbox destination"/);
  assert.match(sandboxSearch, /setDestinationLabel\(place\.label\)/);
  assert.match(sandboxSearch, /new URLSearchParams\(\{ provider: "kayak-sandbox" \}\)/);
});
