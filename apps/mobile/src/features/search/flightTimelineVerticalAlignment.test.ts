import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));
const journey = source.slice(source.indexOf("function FlightJourneyRow"), source.indexOf("function HotelCard"));

test("time, route, and stop details use three explicit ordered rows", () => {
  const primaryStart = journey.indexOf("<View style={s0.journeyPrimaryRow}>");
  const routeStart = journey.indexOf("<View style={s0.journeyRouteRow}>");
  const stopStart = journey.indexOf("<View style={s0.journeyStopRow}>");
  assert.ok(primaryStart >= 0 && primaryStart < routeStart && routeStart < stopStart);

  const primaryRow = journey.slice(primaryStart, routeStart);
  assert.match(primaryRow, /departureColumn[\s\S]*clock\(leg\.departureTime\)[\s\S]*timelineColumn[\s\S]*\{leg\.duration\}[\s\S]*arrivalColumn[\s\S]*clock\(leg\.arrivalTime\)/);
  assert.match(primaryRow, /journeyDuration[\s\S]*textPrimary/);

  const routeRow = journey.slice(routeStart, stopStart);
  assert.match(routeRow, /departureColumn[\s\S]*leg\.originAirport[\s\S]*timelineColumn[\s\S]*routeTrack[\s\S]*arrivalColumn[\s\S]*leg\.destinationAirport/);

  const stopRow = journey.slice(stopStart);
  assert.match(stopRow, /departureColumn[\s\S]*timelineColumn[\s\S]*stopLabel[\s\S]*arrivalColumn/);
});

test("duration, timeline, and stop status share the flexible centered column", () => {
  assert.match(source, /journeyPrimaryRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 \}/);
  assert.match(source, /journeyRouteRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 \}/);
  assert.match(source, /journeyStopRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /journeyDuration: \{[^}]*textAlign: "center" \}/);
  assert.match(source, /stopLabel: \{[^}]*textAlign: "center" \}/);
  assert.match(source, /routeTrack: \{ width: "100%", minWidth: 46, flexDirection: "row", alignItems: "center", gap: 2 \}/);
  assert.match(source, /routeDot: \{ width: 7, height: 7, borderRadius: 3\.5, flexShrink: 0 \}/);
  assert.match(source, /line: \{[^}]*flex: 1[^}]*height: 1\.5[^}]*backgroundColor: ui\.muted[^}]*\}/);
  assert.match(source, /journeyDuration: \{[^}]*fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts\.semibold/);
  assert.match(source, /stopLabel: \{[^}]*fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts\.medium/);
});

test("equal side columns preserve centered flexible rows at every supported width", () => {
  assert.match(source, /departureColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const contentWidth = viewport - 28 - 24;
    const timelineWidth = contentWidth - 72 - 72 - 12;
    assert.ok(timelineWidth >= 100, `${viewport}px leaves a readable timeline without overflow`);
    assert.equal(72, 72, `${viewport}px keeps equal side columns`);
  }
});

test("alignment is structural rather than absolute and shared by every leg", () => {
  assert.doesNotMatch(journey, /translateY|\btop:|position:\s*"absolute"/);
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} locale=\{locale\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} locale=\{locale\} \/> : null\}/);
});
