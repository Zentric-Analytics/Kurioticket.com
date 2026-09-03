import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nearbyFarePriceSize } from "./nearbyFareDateTilePresentation";

const resultsSource = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const tileSource = readFileSync(new URL("./NearbyFareDateTile.tsx", import.meta.url), "utf8");
const cardSource = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");

test("mobile and desktop rails consume one shared fare-date tile", () => {
  assert.equal(resultsSource.match(/<NearbyFareDateTile/g)?.length, 2);
  assert.match(resultsSource, /presentation="mobile"/);
  assert.match(resultsSource, /presentation="desktop"/);
  assert.equal(tileSource.match(/data-fare-date-cell/g)?.length, 1);
});

test("shared tile preserves selected, loading, unavailable, disabled, hover, and focus states", () => {
  assert.match(tileSource, /aria-current=\{selected \? "date"/);
  assert.match(tileSource, /aria-pressed=\{selected\}/);
  assert.match(tileSource, /disabled=\{disabled\}/);
  assert.match(tileSource, /selected && "border-\[#075EE8\] bg-blue-50\/60"/);
  assert.match(tileSource, /absolute inset-x-1\.5 top-0 h-0\.5/);
  assert.match(tileSource, /animate-pulse/);
  assert.match(tileSource, /unavailable && "text-slate-500"/);
  assert.match(tileSource, /hover:border-\[#075EE8\]\/40/);
  assert.match(tileSource, /focus-visible:border-\[#075EE8\]\/50/);
});

test("representative currency values retain controlled one-line sizing", () => {
  for (const value of ["$196.37", "$850.61", "$6,039.76", "€850.61", "£850.61", "¥123,456"])
    assert.equal(nearbyFarePriceSize(value), "default");
  assert.equal(nearbyFarePriceSize("₦1,234,567"), "long");
  assert.match(tileSource, /whitespace-nowrap/);
  assert.match(tileSource, /tabular-nums/);
  assert.match(tileSource, /title=\{formattedPrice \?\? undefined\}/);
});

test("ordinary provider prices hide the visible label while converted estimates retain disclosure", () => {
  const action = cardSource.slice(cardSource.indexOf("function FlightFareAction"), cardSource.indexOf("function FlightDetailLines"));
  assert.match(action, /\{showConvertedProviderPrice \? \([\s\S]*\{priceLabel\}[\s\S]*\) : null\}/);
  assert.match(action, /aria-label=\{priceAriaLabel\}/);
  assert.match(action, /showConvertedProviderPrice \? \([\s\S]*providerPriceLabel/);
});

test("detail columns own and contain long localized values", () => {
  assert.match(cardSource, /grid-cols-3/);
  assert.match(cardSource, /flight-card-detail-item[^"]*border-r/);
  assert.match(cardSource, /flex min-w-0 flex-wrap gap-x-1 \[overflow-wrap:anywhere\]/);
  assert.match(cardSource, /dir="auto"/);
  assert.doesNotMatch(cardSource, /Frontier|F9/);
});
