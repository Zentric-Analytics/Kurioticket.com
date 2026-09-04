import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Hotel Results derives display prices once at screen level and threads snapshots", () => {
  assert.match(source, /const hotelDisplayPrices = useMemo/);
  assert.match(source, /createHotelDisplayPrices\(result\.pricePerNight!/);
  assert.match(source, /displayPrices=\{hotelDisplayPrices\.get\(x\.id\)\}/);
  assert.doesNotMatch(source.slice(source.indexOf("function HotelCard")), /travelApi\.(location|currencyRates)/);
});

test("Hotel cards use one display price for visible, accessible, shared, and detail prices", () => {
  const card = source.slice(source.indexOf("function HotelCard"));
  assert.match(card, /displayPrices\?\.nightly\?\.formatted/);
  assert.match(card, /accessibilityLabel=\{displayPrices\?\.nightly\?\.accessibilityLabel\}/);
  assert.match(card, /hotelDisplayPrices: displayPrices \? JSON\.stringify\(displayPrices\)/);
  assert.match(card, /canonical\.toggleHotel\(result, params\)/);
});
