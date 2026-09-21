import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const control = readFileSync("src/components/results/FlightPriceAlertControl.tsx", "utf8");

test("mobile Flight Results passes unfiltered provider inventory into its one alert control", () => {
  assert.equal(results.match(/<FlightPriceAlertControl/g)?.length, 1);
  assert.match(results, /<FlightPriceAlertControl query=\{mobileFlightPriceAlertQuery\} results=\{providerResults\}/);
  assert.doesNotMatch(results, /results=\{filtered|results=\{sortedResults/);
});

test("Flight switch creates automatic tracking immediately with a live baseline", () => {
  assert.match(control, /selectAutomaticFlightBaseline\(results, query\.currency\)/);
  assert.match(control, /buildAutomaticFlightPriceAlertPayload\(\{ origin: query\.origin, destination: query\.destination, baselinePrice: baseline\.price, currency: baseline\.currency, query \}\)/);
  assert.match(control, /method: "POST"/);
  assert.doesNotMatch(control, /role="dialog"|Target price|Create alert|priceAlertTargetSchema/);
});

test("Flight switch reconciles automatic records, pauses, reactivates and handles duplicates", () => {
  assert.match(control, /matchingAutomaticFlightPriceAlert\(alerts, query\)/);
  assert.match(control, /matchingAlert\?\.status === "PAUSED"[\s\S]*patchStatus\(matchingAlert, "ACTIVE"\)/);
  assert.match(control, /patchStatus\(matchingAlert, "PAUSED"\)/);
  assert.match(control, /response\.status === 409[\s\S]*matchingAutomaticFlightPriceAlert\(\[body\.alert\], query\)/);
});

test("authoritative failures leave the switch off and authentication preserves Results URL", () => {
  assert.match(control, /if \(!saved\) \{ showFeedback\(next \? "error-start" : "error-pause"\); return; \}/);
  assert.match(control, /\/auth\/signin\?callbackUrl=\$\{encodeURIComponent\(location\.pathname \+ location\.search\)\}/);
  assert.match(control, /aria-checked=\{tracking\}/);
});

test("Flight feedback is accessible and mutation geometry is stable", () => {
  assert.match(control, /role=\{feedback\.startsWith\("error"\) \? "alert" : "status"\} aria-live="polite"/);
  assert.match(control, /Price tracking is on/);
  assert.match(control, /We'll notify you if the price drops\./);
  assert.match(control, />Manage</);
  assert.match(control, /Price tracking paused/);
  assert.match(control, /className="flex w-5 justify-center"/);
  assert.match(control, /className="flex w-\[51px\] justify-end"/);
});
