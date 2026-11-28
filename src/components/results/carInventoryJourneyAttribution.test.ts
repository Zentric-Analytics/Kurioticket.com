import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { journeyRequestId } from "@/lib/journeyEventClient";

const loader = readFileSync(new URL("./CarInventoryLoader.tsx", import.meta.url), "utf8");
const journey = readFileSync(new URL("../privacy/JourneyEventsProvider.tsx", import.meta.url), "utf8");
const endpoint = readFileSync(new URL("../../app/api/cars/search/route.ts", import.meta.url), "utf8");

test("Car result views use only the actual server-issued UUID, never invented search IDs", () => {
  const requestId = "1f5b4cdf-0b72-428e-af87-261129233ab1";
  assert.equal(journeyRequestId(requestId), requestId);
  assert.equal(journeyRequestId("guided-car-0"), null);
  assert.equal(journeyRequestId(""), null);
  assert.match(loader, /const id = journeyRequestId\(data\.requestId\)/);
  assert.match(loader, /setRequestId\(id\)/);
  assert.match(loader, /if \(results\?\.length && requestId\) journeyEvents\.resultsViewed\(requestId\)/);
  assert.doesNotMatch(loader, /crypto\.randomUUID|Date\.now\(\).*requestId/);
});

test("the Car inventory loader sends an impression only after accepted visible results", () => {
  assert.match(loader, /if \(!response\.ok\) throw new Error\("Car inventory unavailable"\)/);
  assert.match(loader, /if \(!Array\.isArray\(data\.results\)\) throw new Error\("Invalid car inventory"\)/);
  assert.match(loader, /if \(active\) \{\s*const id = journeyRequestId\(data\.requestId\)/);
  assert.match(loader, /rememberCarResultsReturn\(key, data\.results, id\)/);
  assert.match(loader, /setRequestId\(id\);\s*setResults\(data\.results\)/);
  assert.match(loader, /useEffect\(\(\) => \{\s*if \(results\?\.length && requestId\) journeyEvents\.resultsViewed\(requestId\)/);
  assert.match(loader, /credentials: "same-origin"/);
  assert.match(loader, /<CarsResultsClient values=\{values\} initialResults=\{results\} inventoryStatus="available" requestId=\{requestId\} sharedCarId=\{sharedCarId\} \/>/);
  assert.match(endpoint, /logSearchHistory\(\{/);
  assert.match(endpoint, /type: "CAR"/);
});

test("Car views retain the existing consent-aware journey sender", () => {
  assert.match(loader, /useJourneyEvents\(\)/);
  assert.match(journey, /const browserActionId = \(\) => crypto\.randomUUID\(\)/);
  assert.match(journey, /allowed: \(\) => getConfirmedBrowserAnalyticsSignal\(\) !== null/);
  assert.match(journey, /resultsViewed\(requestId\) \{[\s\S]*?if \(!requestId \|\| !signal[\s\S]*?return;\s*sender\.send\(\{ type: "RESULTS_VIEWED", requestId/);
});

test("Car provider handoffs propagate the validated search request ID", () => {
  const results = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
  const deals = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  const detailPage = readFileSync(new URL("../../app/cars/details/[id]/page.tsx", import.meta.url), "utf8");
  const endpoint = readFileSync(new URL("../../app/api/cars/handoff/route.ts", import.meta.url), "utf8");
  assert.match(results, /requestId=\{requestId\}/);
  assert.match(card, /recordCarHandoffClick\(car\.id, offer\.id, "car-results", requestId\)/);
  assert.match(deals, /recordCarHandoffClick\(car\.id, offerId, "car-results", requestId\)/);
  assert.match(detailPage, /journeyRequestId\(value\(query\.requestId\)\)/);
  assert.match(endpoint, /handoffTrackingId\(body\.requestId\)/);
});
