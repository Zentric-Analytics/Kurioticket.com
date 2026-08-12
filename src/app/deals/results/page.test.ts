import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dealsPackageModes } from "@/lib/deals/dealsSearchParams";
import {
  getFirstDealsJourneyStage,
  getNextDealsJourneyStage,
} from "@/lib/deals/dealsJourneyRoutes";

const expected = {
  "hotel-flight": [
    "hotel-results",
    "hotel-details",
    "flight-results",
    "flight-details",
  ],
  "hotel-flight-car": [
    "hotel-results",
    "hotel-details",
    "flight-results",
    "flight-details",
    "car-results",
  ],
  "hotel-car": ["hotel-results", "hotel-details", "car-results"],
  "flight-car": ["flight-results", "flight-details", "car-results"],
} as const;

test("valid Deals results requests server-redirect to the canonical first sequential stage", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /if \(!invalid\)[\s\S]*redirect\([\s\S]*buildDealsJourneyUrl\(getFirstDealsJourneyStage\(search\.mode\), search\)/,
  );
  assert.ok(
    source.indexOf("redirect(") < source.indexOf("<DealsResultsClient"),
  );
});

test("all package modes progress product-by-product directly to handoff, never Review", () => {
  for (const mode of dealsPackageModes) {
    const visited = [getFirstDealsJourneyStage(mode)];
    while (getNextDealsJourneyStage(visited.at(-1)!, mode))
      visited.push(getNextDealsJourneyStage(visited.at(-1)!, mode)!);
    assert.deepEqual(visited, expected[mode]);
    assert.equal(visited.includes("review"), false);
    assert.equal(getNextDealsJourneyStage(visited.at(-1)!, mode), null);
  }
});
