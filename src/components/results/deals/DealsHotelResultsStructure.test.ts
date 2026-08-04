import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("guided Hotel results adapt the shared results experience and HotelCard", async () => {
  const [stage, shared, card] = await Promise.all([
    readFile(new URL("./DealsHotelResultsStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../HotelResultsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../HotelCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(stage, /<HotelResultsExperience/);
  assert.match(stage, /buildDealsHotelDetailsJourneyUrl/);
  for (const forbidden of ["HotelSearchBar", "<main", "<h1", "/api/flights", "/api/cars", "writeDealsStagedJourneyPlan", "confirmDealsHotelRoom"]) assert.doesNotMatch(stage, new RegExp(forbidden));
  assert.match(shared, /<HotelCard/);
  assert.match(shared, /allowExternalAttribution=\{!guided\}/);
  assert.match(card, /allowExternalAttribution && isSafeHttpUrl/);
});

test("guided Hotel details has a truthful pending marker", async () => {
  const shell = await readFile(new URL("./DealsJourneyShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /data-deals-guided-hotel-details-pending/);
  assert.doesNotMatch(shell, /Continue to Flight|Confirm room/);
});
