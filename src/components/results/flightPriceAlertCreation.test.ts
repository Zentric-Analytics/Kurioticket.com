import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");

test("flight results renders a visible keyboard-accessible create price alert entry point", () => {
  assert.match(source, /Create price alert/);
  assert.match(source, /priceAlertButtonRef/);
  assert.match(source, /<button[\s\S]*Create price alert/);
  assert.match(source, /disabled=\{sessionStatus === "loading" \|\| !canonicalPriceAlertQuery\}/);
  assert.match(source, /min-h-11[\s\S]*Create price alert/);
});

test("signed-out price alert creation preserves return path and does not call API first", () => {
  const authBlock = source.slice(source.indexOf("const openPriceAlertDialog"), source.indexOf("const closePriceAlertDialog"));
  assert.match(authBlock, /sessionStatus !== "authenticated"/);
  assert.match(authBlock, /callbackUrl=\$\{encodeURIComponent\(returnPath\)\}/);
  assert.doesNotMatch(authBlock, /fetch\("\/api\/price-alerts"/);
});

test("dialog includes accessible semantics, escape close, target validation and feedback", () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="price-alert-dialog-title"/);
  assert.match(source, /htmlFor="price-alert-target"/);
  assert.match(source, /Target price \(\{canonicalPriceAlertQuery\?\.currency\}\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /priceAlertButtonRef\.current\?\.focus\(\)/);
});

test("canonical payload is posted without arbitrary URL fields", () => {
  assert.match(source, /fetch\("\/api\/price-alerts"/);
  assert.match(source, /type: "FLIGHT"/);
  assert.match(source, /origin: canonicalPriceAlertQuery\.origin/);
  assert.match(source, /destination: canonicalPriceAlertQuery\.destination/);
  assert.match(source, /currency: canonicalPriceAlertQuery\.currency/);
  assert.match(source, /query: canonicalPriceAlertQuery/);
  assert.doesNotMatch(source, /queryString[\s\S]{0,200}\/api\/price-alerts/);
});

test("success and failures are handled without page reload", () => {
  assert.match(source, /Price alert created\. We’ll email you if the fare reaches your target\./);
  assert.match(source, /You already have this price alert\./);
  assert.match(source, /Network error\. Check your connection and try again\./);
  assert.doesNotMatch(source, /window\.location\.reload/);
});
