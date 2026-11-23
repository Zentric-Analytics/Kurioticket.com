import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");
const results = read("src/components/results/FlightResultsClient.tsx");
const flightCard = read("src/components/results/FlightCard.tsx");
const kayakCard = read("src/components/results/KayakResultCard.tsx");
const kayakDetails = read("src/app/sandbox/kayak/details/KayakSandboxDetails.tsx");
const kayakClient = read("src/components/results/KayakMetasearchClient.tsx");

test("flight mobile navigation freezes exact results order and KAYAK offers before leaving", () => {
  assert.match(results, /onClickCapture=\{rememberVisibleFlightResults\}/);
  assert.match(results, /writeFlightResultsReturnView\(\{/);
  assert.match(results, /resultIds: sortedResults\.map\(flight => flight\.id\)/);
  assert.match(results, /kayakOffers: displayedKayakOffers/);
  assert.match(results, /kayakCriteria: displayedKayakCriteria/);
  assert.match(results, /readFlightResultsReturnView\(searchKey, window\.location\.pathname \+ window\.location\.search\)/);
  assert.match(results, /restoredFlightView\.resultIds\.map\(id => byId\.get\(id\)!\)/);
  assert.match(results, /restoredFlightView\.sortMode === sortMode/);
  assert.match(results, /if \(returnView\) setSortMode\(returnView\.sortMode\)/);
  assert.match(results, /restoredFlightView\.href === "\/flights\/results\?" \+ queryString/);
});

test("on Back, missing or expired results require an explicit Search again", () => {
  const guard = results.indexOf("if (!shouldBypassSnapshot && returnIntentRef.current?.returning");
  const fetch = results.indexOf('fetch("/api/flights/search"', guard);
  assert.ok(guard >= 0 && guard < fetch);
  const guarded = results.slice(guard, fetch);
  assert.match(guarded, /!snapshotState\?\.isFresh \|\| !returnView/);
  assert.match(guarded, /setResults\(\[\]\)/);
  assert.match(guarded, /setError\("Your previous flight results have expired/);
  assert.match(guarded, /return;/);
  assert.match(results, /exactFlightReturnUnavailable/);
  assert.match(results, /onClick=\{retryMainInventorySearch\}/);
});

test("KAYAK details preserve originating flight results without forcing provider requests", () => {
  assert.match(flightCard, /markResultsReturn\("flight", window\.location\.href\)/);
  assert.match(flightCard, /resolvedDetailsHref\?\.startsWith\("\/sandbox\/kayak\/details"\)/);
  assert.match(kayakCard, /resultsHref/);
  assert.match(kayakDetails, /useResultsReturnIntent\("flight", flightResultsHref\)/);
  assert.match(kayakDetails, /Back to flight results/);
  assert.match(kayakClient, /peekResultsReturn\("flight", window\.location\.href\)/);
  assert.match(kayakClient, /peekFlightResultsReturnView\(href\)/);
  assert.match(kayakClient, /setOffers\(snapshot\.kayakOffers\)/);
  assert.match(kayakClient, /if \(vertical === "flights" && returning\?\.returning\)/);
  assert.match(kayakClient, /void run\(\)/);
});

test("flight return scroll waits for the virtualized result list", () => {
  assert.match(results, /const y = takeResultsScroll\("flight"\)/);
  assert.match(results, /resultsUiPreparing \|\| error \|\| !sortedResults\.length/);
  assert.match(results, /document\.documentElement\.scrollHeight < y \+ window\.innerHeight/);
  assert.match(results, /window\.scrollTo\(\{ top: y, behavior: "instant" \}\)/);
});
