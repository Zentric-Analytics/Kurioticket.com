import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runner = await readFile("scripts/run-travel-parity.mjs", "utf8");
const workflow = await readFile(".github/workflows/pr-required-gates.yml", "utf8");

test("the authoritative parity runner covers every travel matrix", () => {
  for (const evidence of [
    "flightSearchModel", "flightResultsRoute", "searchContract", "duffelProvider.searchContract",
    "hotelSearchModel", "hotelDiscoveryIntent", "hotelExplorationSearch", "hotelResultsBoundary", "hotelDestinations", "homepageCountryDirectory",
    "carSearchModel", "carResultsRoute", "carCanonicalCatalog", "carResults", "carSavedState",
    "packageSearchModel", "packagesNavigation", "packageOrchestrator", "api/packages/search",
    "accountCapabilityContract", "savedSearchContext", "recentSearchNavigation", "hotelPriceAlerts", "hotelPriceAlertModel",
    "travelPipelineAlignment", "canonicalResultAcceptance", "travelEntryPresentation",
  ]) assert.match(runner, new RegExp(evidence.replaceAll("/", "\\/")), evidence);
});

test("required PR CI executes the deterministic parity command", () => {
  assert.match(workflow, /name: Travel platform parity/);
  assert.match(workflow, /run: npm run travel:parity/);
  assert.doesNotMatch(runner, /https?:\/\//);
});
