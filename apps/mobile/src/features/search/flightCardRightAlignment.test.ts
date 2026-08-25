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
  assert.match(source, /departureColumn: \{ flexBasis: 62, minWidth: 62, flexShrink: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 82, minWidth: 82, flexShrink: 0 \}/);
});

test("arrival and price terminate on the shared right edge", () => {
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(card, /style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}/);
  assert.match(card, /style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}>[\s\S]*?s0\.bigPrice/);
  assert.doesNotMatch(card, /View details|detailsButton/);
  assert.doesNotMatch(card, />\{roundTrip \? "round trip" : "one way"\}<\/Text>/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch"/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.doesNotMatch(source, /priceBox:/);
  assert.match(source, /benefits: \{[\s\S]*?flexDirection: "row"/);
  assert.match(source, /actionColumn: \{ width: 112, maxWidth: "45%", flexShrink: 0, alignItems: "flex-end", gap: 3 \}/);
  assert.doesNotMatch(card, /marginRight/);
  const actionColumnStyle = /actionColumn: \{([^}]*)\}/.exec(source)?.[1] ?? "";
  assert.doesNotMatch(actionColumnStyle, /position|top|bottom|marginTop/);
});

test("journeys begin in the airline copy column rather than beneath the logo", () => {
  const identityLayout = card.slice(card.indexOf('<View style={s0.flightIdentityLayout}>'), card.indexOf('<View style={s0.benefits}>'));
  assert.match(identityLayout, /airlineLogoColumn[\s\S]*?flightDetails[\s\S]*?airlineName[\s\S]*?journeyList[\s\S]*?FlightJourneyRow/);
  assert.match(source, /flightIdentityLayout: \{[^}]*flexDirection: "row"[^}]*gap: 10/);
  assert.match(source, /airlineLogoColumn: \{ width: 32, flexShrink: 0/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.doesNotMatch(card, /<\/View>\s*<FlightJourneyRow label="OUTBOUND"/);
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

test("the compact shared action column contains the only displayed fare", () => {
  const actionColumn = /<View style=\{\[s0\.actionColumn, s0\.rightColumnContract\]\}>([\s\S]*?)<\/View>/.exec(card)?.[1] ?? "";
  const benefits = /<View style=\{s0\.benefits\}>([\s\S]*?)\n      <\/View>\n    <\/View>/.exec(card)?.[1] ?? "";

  assert.equal(card.match(/\{fare\?\.formatted \?\? "—"\}/g)?.length, 1);
  assert.match(actionColumn, /\{fare\?\.formatted \?\? "—"\}/);
  assert.match(actionColumn, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(benefits, /style=\{s0\.benefitList\}[\s\S]*?baggageBenefit[\s\S]*?fareBenefit[\s\S]*?style=\{\[s0\.actionColumn/);
  assert.doesNotMatch(actionColumn, /Pressable|View details/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});
