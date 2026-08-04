import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("guided shell reuses shared Deals presentation without product or provider integration", async () => { const source = await readFile(new URL("./DealsJourneyShell.tsx", import.meta.url), "utf8"); for (const component of ["DealsResultsSearchSummary", "DealsModifySearchDialog", "DealsJourneyProgress"]) assert.match(source, new RegExp(`<${component}`)); assert.match(source, /data-deals-guided-journey-foundation/); assert.equal((source.match(/<h1/g) ?? []).length, 1); for (const forbidden of ["DealsSearchForm", "/api/hotels", "/api/flights", "/api/cars", "bookingUrl", "partnerRedirectUrl", "/redirect", "target=\"_blank\""]) assert.doesNotMatch(source, new RegExp(forbidden)); });
test("public Deals and package results contracts remain active", async () => { const [landing, results, handoff] = await Promise.all([readFile(new URL("../../../app/deals/page.tsx", import.meta.url), "utf8"), readFile(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8"), readFile(new URL("../../../app/deals/handoff/page.tsx", import.meta.url), "utf8")]); assert.match(landing, /<DealsSearchForm/); assert.doesNotMatch(landing, /deals\/journey/); assert.match(results, /buildDealsPackageCandidates/); assert.match(results, /stagedHotelJourneyActive/); assert.match(handoff, /DealsHandoffClient/); });
test("server client boundaries are keyed by scope and search fingerprint, not stage", async () => { const [guided, results] = await Promise.all([readFile(new URL("../../../app/deals/journey/[stage]/page.tsx", import.meta.url), "utf8"), readFile(new URL("../../../app/deals/results/page.tsx", import.meta.url), "utf8")]); for (const source of [guided, results]) { assert.match(source, /buildDealsSearchFingerprint\(search\)/); assert.match(source, /buildDealsPlanContextKey/); assert.match(source, /key=\{contextKey\}/); } assert.doesNotMatch(guided, /buildDealsPlanContextKey\([^\n]*stage/); });

test("guided hotel confirmation creates only canonical validated base Trip Plan paths", async () => {
  const source = await readFile(new URL("./DealsJourneyShell.tsx", import.meta.url), "utf8");
  assert.match(source, /buildCarResultsUrl\(search\)/);
  assert.match(source, /const resultsPath = validateDealsInternalPath\(buildDealsResultsUrl\(search\)\)/);
  assert.match(source, /const carsResultsPath = included\.car[\s\S]*validateDealsInternalPath\([\s\S]*buildCarResultsUrl\(search\),[\s\S]*"\/cars\/results"/);
  assert.match(source, /if \(!resultsPath \|\| \(included\.car && !carsResultsPath\)\) \{[\s\S]*setConfirmingHotel\(false\);[\s\S]*setConfirmationError\(t\("deals\.guided\.hotelDetails\.saveError"\)\);[\s\S]*return;/);
  assert.match(source, /createDealsTripPlan\(\{ mode: search\.mode, searchFingerprint: fingerprint, resultsPath, \.\.\.\(included\.car && carsResultsPath \? \{ carsResultsPath \} : \{\}\) \}\)/);
  const baseCreation = source.slice(source.indexOf("if (!base)"), source.indexOf("const nextPlan = replaceDealsHotelSelection"));
  assert.doesNotMatch(baseCreation, /\|\|\s*"\/deals\/results"/);
  assert.doesNotMatch(baseCreation, /\|\|\s*"\/cars\/results"/);
  assert.doesNotMatch(baseCreation, /validateDealsInternalPath\("\/cars\/results"/);
  assert.ok(baseCreation.indexOf("writeDealsStagedJourneyPlan") === -1);
  assert.ok(baseCreation.indexOf("router.push") === -1);
});
