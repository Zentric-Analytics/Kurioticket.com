import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const results = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightCard = results.slice(results.indexOf("function FlightBenefitItem"), results.indexOf("function HotelCard"));

test("flight lower card organizes truthful provider information into accessible benefit items", () => {
  assert.match(flightCard, /label="Baggage" value=\{result\.baggageInfo \|\| "Baggage details unavailable"\}/);
  assert.match(flightCard, /label="Seat selection" value="Information unavailable"/);
  assert.match(flightCard, /label="Changes & refunds" value=\{result\.refundInfo \|\| "Fare rules unavailable"\}/);
  assert.match(flightCard, /<View style=\{s0\.flightBenefitsGrid\}>/);
  assert.doesNotMatch(flightCard, /▣|◉/);
});

test("flight details CTA preserves rank treatment and complete navigation payload", () => {
  assert.match(flightCard, /label="View details"[\s\S]*outline=\{rank !== 0\}/);
  assert.match(flightCard, /pathname: "\/flight-details"/);
  assert.match(flightCard, /result: JSON\.stringify\(result\)/);
  assert.match(flightCard, /Object\.entries\(params\)/);
});

test("Step 2 top half stays ahead of the isolated lower section", () => {
  assert.match(flightCard, /<View style=\{s0\.cardTop\}>[\s\S]*<View style=\{s0\.flightMain\}>[\s\S]*<View style=\{s0\.flightLowerSection\}>/);
});

test("Step 1 shell and HotelCard remain outside the FlightCard lower-half change", () => {
  assert.match(results, /<TopBar resultsLayout=\{product === "flight"\}/);
  assert.match(results, /function HotelCard\(/);
  assert.doesNotMatch(flightCard, /hotelCard|hotelCopy|hotelPrice/);
});
