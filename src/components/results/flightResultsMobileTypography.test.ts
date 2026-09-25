import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const resultsSource = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const mobileMarker = "/* The approved desktop FlightCard hierarchy compresses";
const mobile = css.split(mobileMarker)[1].split("@media (max-width: 359px)")[0];
const desktop = css.split(mobileMarker)[0];

test("mobile Flight Results disables text inflation within its existing page scope", () => {
  const textAdjustRule = css.match(
    /@media \(max-width: 639px\) \{\s*\[data-flight-results-main\] \{\s*-webkit-text-size-adjust: 100%;\s*text-size-adjust: 100%;\s*\}\s*\}/,
  )?.[0];

  assert.ok(textAdjustRule);
  assert.equal(css.match(/\[data-flight-results-main\]/g)?.length, 1);
  assert.match(resultsSource, /<main data-flight-results-main[^>]*>/);
  assert.match(
    resultsSource,
    /<main data-flight-results-main[\s\S]*data-nearby-fare-presentation="mobile"[\s\S]*>Cheaper nearby:/,
  );
});

test("nearby insight locks its rendered mobile typography through a dedicated rule", () => {
  const nearbyInsight =
    resultsSource.match(/className="([^"]*)">Cheaper nearby:/)?.[1] ?? "";

  assert.match(nearbyInsight, /flight-mobile-cheaper-nearby/);
  assert.match(nearbyInsight, /font-medium/);
  assert.doesNotMatch(nearbyInsight, /text-\[\d+px\]|leading-\[\d+px\]/);
  assert.match(
    css,
    /@media \(max-width: 639px\) \{[\s\S]*?\.flight-mobile-cheaper-nearby \{[\s\S]*?font-size: 11px !important;[\s\S]*?line-height: 15px !important;[\s\S]*?-webkit-text-size-adjust: none;[\s\S]*?text-size-adjust: none;[\s\S]*?\}/,
  );
});

test("mobile Flight Results uses the native compact hierarchy without changing desktop rules", () => {
  assert.match(css, /font-family: "Inter"/);
  assert.match(mobile, /flight-card-airline-name[\s\S]*?font-size: 0\.8125rem;[\s\S]*?font-weight: 700/);
  assert.match(mobile, /flight-card-flight-number[\s\S]*?font-size: 0\.6875rem/);
  assert.match(mobile, /flight-card-time[\s\S]*?font-size: 0\.875rem;[\s\S]*?font-weight: 800/);
  assert.match(mobile, /flight-card-price[\s\S]*?font-size: 1\.1875rem;[\s\S]*?white-space: nowrap/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?flight-card-price-value\.flight-card-price\[data-price-size="normal"\][\s\S]*?font-size: 1\.1875rem/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?flight-card-price-value\.flight-card-price\[data-price-size="compact"\][\s\S]*?font-size: clamp\(0\.8125rem, 3\.6vw, 0\.9375rem\)/);
  assert.match(mobile, /flight-card-view-button[\s\S]*?min-height: 44px/);
  assert.match(desktop, /\.flight-card-time \{[\s\S]*?font-size: 1\.125rem/);
});

test("long airline and numeric-price overflow protections remain in place", () => {
  const card = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  assert.match(card, /flight-card-airline-name truncate whitespace-nowrap/);
  assert.match(card, /maximumFractionDigits: 0/);
  assert.match(card, /flight-card-price-value[\s\S]*data-price-size=\{priceSize\}/);
  assert.match(card, /\{formattedPrice\}[\s\S]*\{viewFlightLabel\}/);
  assert.match(mobile, /flight-card-price[\s\S]*?white-space: nowrap/);
  assert.match(mobile, /font-variant-numeric: tabular-nums/);
});
