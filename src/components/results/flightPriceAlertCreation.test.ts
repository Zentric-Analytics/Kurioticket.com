import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const control = readFileSync("src/components/results/FlightPriceAlertControl.tsx", "utf8");

test("mobile Flight Results owns one non-sticky canonical price alert before its result count", () => {
  assert.equal(source.match(/<FlightPriceAlertControl query=/g)?.length, 1);
  assert.ok(source.indexOf("data-flight-mobile-results-shortcuts") < source.indexOf("<FlightPriceAlertControl query="));
  assert.ok(source.indexOf("<FlightPriceAlertControl query=") < source.indexOf("formatMobileFlightResultsFound"));
  assert.match(source, /data-flight-mobile-results-intro[^>]*sm:hidden/);
});

test("Flight alert reconciles and mutates through the established API", () => {
  assert.match(control, /fetch\("\/api\/price-alerts", \{ cache: "no-store"/);
  assert.match(control, /fetch\(`\/api\/price-alerts\/\$\{encodeURIComponent\(alert\.id\)\}`/);
  assert.match(control, /buildFlightPriceAlertPayload/);
  assert.match(control, /priceAlertTargetSchema\.safeParse/);
  assert.match(control, /response\.status === 409/);
  assert.match(control, /matchingAlert\?\.status === "PAUSED"[\s\S]*patchStatus\(matchingAlert, "ACTIVE"\)/);
  assert.match(control, /patchStatus\(matchingAlert, "PAUSED"\)/);
});

test("compact alert and target sheet match native copy and accessibility", () => {
  assert.match(control, /Track this flight price/);
  assert.match(control, /role="switch"/);
  assert.match(control, /aria-checked=\{Boolean\(tracking\)\}/);
  assert.match(control, /role="dialog" aria-modal="true"/);
  assert.match(control, />Track prices</);
  assert.match(control, /Target price \(\{query\.currency\}\)/);
  assert.match(control, /aria-label=\{`Target price in \$\{query\.currency\}`\}/);
  assert.match(control, /pending \? "Creating…" : "Create alert"/);
  assert.match(control, /aria-label="Close price alert"/);
});

test("authentication preserves the current Results URL", () => {
  assert.match(control, /\/auth\/signin\?callbackUrl=\$\{encodeURIComponent\(location\.pathname \+ location\.search\)\}/);
});
