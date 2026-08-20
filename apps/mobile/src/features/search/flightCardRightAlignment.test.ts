import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));

test("outbound and return share one three-band journey component", () => {
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} \/> : null\}/);
  assert.equal(card.match(/<View style=\{\[s0\.arrivalColumn, s0\.rightColumnContract\]\}>/g)?.length, 2);
  assert.match(source, /journeyRow: \{ width: "100%" \}/);
  assert.match(source, /timeTimelineRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
  assert.match(source, /departureColumn: \{ flexBasis: 78, minWidth: 78, flexShrink: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 70, alignItems: "center" \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 78, minWidth: 78, flexShrink: 0 \}/);
});

test("arrival, price, and action terminate on the shared right edge", () => {
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(card, /style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}/);
  assert.match(card, /style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}>[\s\S]*?s0\.bigPrice[\s\S]*?accessibilityLabel="View details"/);
  assert.doesNotMatch(card, />\{roundTrip \? "round trip" : "one way"\}<\/Text>/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch"/);
  assert.match(source, /flightDetails: \{ width: "100%"/);
  assert.doesNotMatch(source, /priceBox:/);
  assert.match(source, /benefits: \{[\s\S]*?flexDirection: "row"/);
  assert.match(source, /actionColumn: \{ flexShrink: 0, alignItems: "flex-end", gap: 12 \}/);
  assert.doesNotMatch(card, /marginRight/);
  const actionColumnStyle = /actionColumn: \{([^}]*)\}/.exec(source)?.[1] ?? "";
  assert.doesNotMatch(actionColumnStyle, /position|top|bottom|marginTop/);
});

test("one-way cards omit return while preserving the shared right-side contract", () => {
  assert.match(card, /const roundTrip = one\(params\.tripType\) === "round-trip"/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow[^\n]+ : null\}/);
  assert.doesNotMatch(card, /"round trip" : "one way"/);
  assert.match(card, /style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}/);
});

test("long fares stay readable without changing details navigation or theme behavior", () => {
  assert.match(card, /\{fare\?\.formatted \?\? "—"\}/);
  assert.match(card, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
  assert.match(card, /backgroundColor: theme\.surface/);
  assert.match(card, /shadowColor: theme\.dark \?/);
});

test("the shared action column contains the only displayed fare above the unchanged CTA", () => {
  const actionColumn = /<View style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}>([\s\S]*?)<\/View>/.exec(card)?.[1] ?? "";
  const benefits = /<View style=\{s0\.benefits\}>([\s\S]*?)\n      <\/View>\n    <\/View>/.exec(card)?.[1] ?? "";

  assert.equal(card.match(/\{fare\?\.formatted \?\? "—"\}/g)?.length, 1);
  assert.match(actionColumn, /\{fare\?\.formatted \?\? "—"\}[\s\S]*?View details/);
  assert.match(actionColumn, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(benefits, /style=\{s0\.benefitList\}[\s\S]*?summarizeBaggage[\s\S]*?Seat unavailable[\s\S]*?summarizeFareRules[\s\S]*?style=\{\[s0\.actionColumn/);
  assert.match(actionColumn, /pathname: "\/flight-details"/);
  assert.match(actionColumn, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});
