import assert from "node:assert/strict";
import test from "node:test";
import { clientJourneyDecisionTypes, journeyFilterGroups, journeySortModes, normalizeJourneySortMode } from "./search-journey";

test("Phase 2 event names remain distinct from existing journey stages", () => {
  assert.deepEqual([...clientJourneyDecisionTypes], ["SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED"]);
  assert.equal(new Set(clientJourneyDecisionTypes).size, clientJourneyDecisionTypes.length);
  assert.equal(journeyFilterGroups.includes("searchText" as never), false);
  assert.equal(journeySortModes.includes("providerUrl" as never), false);
});

test("sort tracking stores coarse enum keys, never arbitrary option labels", () => {
  assert.equal(normalizeJourneySortMode("cheapest"), "price");
  assert.equal(normalizeJourneySortMode("lowestTotal"), "price");
  assert.equal(normalizeJourneySortMode("fastest"), "fastest");
  assert.equal(normalizeJourneySortMode("bestValue"), "best");
  assert.equal(normalizeJourneySortMode("topRated"), "rating");
  assert.equal(normalizeJourneySortMode("recommended"), "recommended");
  assert.equal(normalizeJourneySortMode("hidden-free-text"), "other");
});
