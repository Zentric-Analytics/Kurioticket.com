import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);
const flightCard = source.slice(
  source.indexOf("function FlightBenefitItem"),
  source.indexOf("function HotelCard"),
);

test("flight lower-card benefits preserve authoritative values and truthful fallbacks", () => {
  assert.match(flightCard, /label="Baggage"[\s\S]*value=\{result\.baggageInfo \|\| "Baggage details unavailable"\}/);
  assert.match(flightCard, /label="Seat selection"[\s\S]*value="Information unavailable"/);
  assert.match(flightCard, /label="Changes & refunds"[\s\S]*value=\{result\.refundInfo \|\| "Fare rules unavailable"\}/);
});

test("flight benefits use organized, wrapping items with decorative project icons", () => {
  assert.match(flightCard, /function FlightBenefitItem/);
  assert.match(flightCard, /<FlowIcon name=\{icon\}/);
  assert.match(flightCard, /style=\{s0\.flightBenefitLabel\}>\{label\}/);
  assert.match(flightCard, /style=\{s0\.flightBenefitValue\}>\{value\}/);
  assert.match(source, /flightBenefitsGrid: \{[\s\S]*flexWrap: "wrap"/);
  assert.match(source, /flightBenefitNarrow: \{ width: "100%" \}/);
  assert.doesNotMatch(flightCard, /[\u25a3\u25c9]/);
});

test("View details preserves ranking treatment and all existing navigation params", () => {
  assert.match(flightCard, /label="View details"[\s\S]*outline=\{rank !== 0\}/);
  assert.match(flightCard, /pathname: "\/flight-details"/);
  assert.match(flightCard, /result: JSON\.stringify\(result\)/);
  assert.match(flightCard, /Object\.fromEntries\(Object\.entries\(params\)/);
  assert.match(flightCard, /<View style=\{\[s0\.flightDetailsCta, compactItinerary && s0\.flightDetailsCtaCompact\]\}>[\s\S]*<Button/);
});

test("narrow flight cards isolate large prices without shrinking itinerary text", () => {
  assert.match(flightCard, /const compactItinerary = width < 380/);
  assert.match(flightCard, /compactItinerary && s0\.itineraryRowCompact/);
  assert.match(flightCard, /compactItinerary && s0\.priceBoxCompact/);
  assert.match(source, /priceBoxCompact: \{ width: "100%", minWidth: 0 \}/);
  assert.match(source, /flightDetailsCtaCompact: \{ width: "100%" \}/);
  assert.doesNotMatch(flightCard, /horizontal/);
});

test("Step 2 flight top, Step 1 shell, and HotelCard remain present", () => {
  assert.match(flightCard, /<View style=\{s0\.cardTop\}>/);
  assert.match(flightCard, /<View style=\{s0\.flightMain\}>/);
  assert.match(flightCard, /s0\.priceBox/);
  assert.match(source, /<TopBar resultsLayout=\{product === "flight"\}/);
  assert.match(source, /function HotelCard\(/);
});
