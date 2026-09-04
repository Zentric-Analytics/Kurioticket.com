import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));

test("outbound and return share one structured journey component", () => {
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} locale=\{locale\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} locale=\{locale\} \/> : null\}/);
  assert.equal(card.match(/<View style=\{\[s0\.arrivalColumn, s0\.rightColumnContract\]\}>/g)?.length, 2);
  assert.match(source, /journeyPrimaryRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 \}/);
  assert.match(source, /departureColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
});

test("arrival and price terminate on the shared right edge", () => {
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(card, /<View style=\{s0\.flightCommercialRegion\}>\s*<Text[^>]*s0\.bigPrice/);
  assert.doesNotMatch(card, /View details|detailsButton/);
  assert.doesNotMatch(card, />\{roundTrip \? "round trip" : "one way"\}<\/Text>/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch"/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.doesNotMatch(source, /priceBox:/);
  assert.match(source, /flightCommercialRegion: \{ width: "46%", minWidth: 104, flexShrink: 0, alignItems: "flex-end"/);
  assert.match(source, /estimatedPrice: \{ fontSize: 10, lineHeight: 13, fontWeight: "700", fontFamily: appFonts\.bold, letterSpacing: 0\.7, textAlign: "right" \}/);
  assert.match(source, /providerPrice: \{[^}]*fontSize: 11, lineHeight: 14[^}]*textAlign: "right"/);
  assert.match(source, /flightLowerSection: \{[^\n]*flexDirection: "row"[^\n]*alignItems: "flex-start"/);
  assert.doesNotMatch(source, /actionColumn:/);
  assert.doesNotMatch(card, /marginRight/);
  const fareRowStyle = /flightCommercialRegion: \{([^}]*)\}/.exec(source)?.[1] ?? "";
  assert.doesNotMatch(fareRowStyle, /position|top|bottom|marginRight/);
});

test("journeys follow the compact identity row at the full card content width", () => {
  const flightMain = card.slice(card.indexOf('<View style={s0.flightMain}>'), card.indexOf('<View style={[s0.flightCardFooter'));
  const identityStart = flightMain.indexOf('<View style={s0.flightIdentityLayout}>');
  const journeyStart = flightMain.indexOf('<View style={s0.journeyList}>');
  const identityLayout = flightMain.slice(identityStart, journeyStart);
  const flightDetails = identityLayout.slice(identityLayout.indexOf('<View style={s0.flightDetails}>'));

  assert.ok(identityStart >= 0 && journeyStart > identityStart, "journey list follows the identity row");
  assert.match(identityLayout, /airlineLogoColumn[\s\S]*?<AirlineLogo[\s\S]*?flightDetails[\s\S]*?airlineHeader/);
  assert.doesNotMatch(flightDetails, /journeyList|FlightJourneyRow/);
  assert.match(flightMain.slice(journeyStart), /journeyList[\s\S]*?<FlightJourneyRow label="OUTBOUND"[\s\S]*?returnLeg \? <FlightJourneyRow label="RETURN"/);
  assert.match(source, /flightIdentityLayout: \{[^}]*flexDirection: "row"[^}]*gap: 8/);
  assert.match(source, /airlineLogoColumn: \{ width: 38, flexShrink: 0/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /journeyList: \{ width: "100%", marginTop: 8, gap: 10 \}/);
});

test("one-way cards omit return while preserving the fare-action alignment", () => {
  assert.match(card, /const roundTrip = one\(params\.tripType\) === "round-trip"/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow[^\n]+ : null\}/);
  assert.doesNotMatch(card, /"round trip" : "one way"/);
  assert.match(card, /<View style=\{s0\.flightCommercialRegion\}>\s*<Text/);
});

test("long fares stay readable without changing details navigation or theme behavior", () => {
  assert.match(card, /\{fare\?\.formatted \?\? "—"\}/);
  assert.match(card, /s0\.bigPrice[^>]*numberOfLines=\{1\}/);
  assert.doesNotMatch(card, /s0\.bigPrice[^>]*adjustsFontSizeToFit|s0\.bigPrice[^>]*minimumFontScale/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
  assert.match(card, /backgroundColor: theme\.surface/);
  assert.match(card, /shadowColor: theme\.dark \?/);
});

test("the coherent price column contains the only displayed fare and no CTA", () => {
  const fareRow = card.slice(card.indexOf('<View style={s0.flightCommercialRegion}>'));

  assert.equal(card.match(/\{fare\?\.formatted \?\? "—"\}/g)?.length, 1);
  assert.match(fareRow, /\{fare\?\.formatted \?\? "—"\}/);
  assert.match(fareRow, /accessible=\{false\}/);
  assert.match(fareRow, /s0\.bigPrice[^>]*numberOfLines=\{1\}/);
  assert.doesNotMatch(fareRow, /s0\.bigPrice[^>]*adjustsFontSizeToFit|s0\.bigPrice[^>]*minimumFontScale/);
  assert.match(source, /bigPrice: \{[^}]*fontSize: 19, lineHeight: 24[^}]*fontWeight: "700"[^}]*textAlign: "right"/);
  assert.match(fareRow, /color: theme\.textPrimary/);
  assert.doesNotMatch(fareRow, /marginRight|position:/);
  assert.doesNotMatch(fareRow, /baggageSummary|fareRulesSummary|metadataItem/);
  assert.match(fareRow, /mainPriceBasis \?[\s\S]*mainPriceBasis\.label/);
  assert.match(fareRow, /providerFare \? \([\s\S]*Provider price: \{providerFare\.formatted\}/);
  assert.doesNotMatch(fareRow, /Provider price: \{providerFare\.formatted\} \{providerFare\.currency\}/);
  assert.doesNotMatch(fareRow, /US\$|A\$|CA\$|Per traveler|Round trip|One way|Taxes included|From/);
  assert.match(card, /<Pressable[\s\S]*accessibilityLabel=\{cardAccessibilityLabel\}[\s\S]*onPress=\{openDetails\}/);
  assert.doesNotMatch(fareRow, /View deal|labels\.viewDeal|flightDealAction/);
  assert.doesNotMatch(fareRow, /labels\.viewFlight|View details/);
  assert.ok(card.indexOf('<View style={s0.journeyList}>') < card.indexOf('<View style={s0.flightCommercialRegion}>'));
  assert.match(card, /provider price \$\{providerFare\.accessibilityLabel\}/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});
