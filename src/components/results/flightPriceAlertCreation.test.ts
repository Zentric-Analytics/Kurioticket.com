import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");

test("flight results no longer promotes or creates price alerts", () => {
  assert.doesNotMatch(source, /Track this route/);
  assert.doesNotMatch(source, /Create price alert/);
  assert.doesNotMatch(source, /fetch\("\/api\/price-alerts"/);
  assert.doesNotMatch(source, /priceAlert(?:Dialog|Target|Error|Status|Submitting|Button|Input)/);
  assert.doesNotMatch(source, /buildCanonicalFlightPriceAlertQuery/);
});
