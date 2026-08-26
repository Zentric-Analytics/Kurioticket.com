import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));
const journey = source.slice(source.indexOf("function FlightJourneyRow"), source.indexOf("function HotelCard"));

test("departure, informative route timeline, and arrival share one explicit row", () => {
  const row = journey.slice(journey.indexOf("<View style={s0.journeyRow}>"));
  assert.match(row, /departureColumn[\s\S]*clock\(leg\.departureTime\)[\s\S]*leg\.originAirport/);
  assert.match(row, /timelineColumn[\s\S]*journeyDuration[\s\S]*\{leg\.duration\} · \{stopLabel\}[\s\S]*routeTrack/);
  assert.match(row, /routeTrack[\s\S]*routeDot[\s\S]*s0\.line[\s\S]*<PlaneTakeoff accessible=\{false\} size=\{14\}[\s\S]*s0\.line[\s\S]*routeDot/);
  assert.match(row, /routeSummary[\s\S]*\{leg\.originAirport\} → \{leg\.destinationAirport\}[\s\S]*arrivalColumn[\s\S]*clock\(leg\.arrivalTime\)[\s\S]*leg\.destinationAirport/);
  assert.match(source, /journeyRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
});

test("duration appears once above the track and directional route summary appears below", () => {
  assert.equal(journey.match(/\{leg\.duration\} · \{stopLabel\}/g)?.length, 1);
  assert.ok(journey.indexOf("s0.journeyDuration") < journey.indexOf("s0.routeTrack"));
  assert.ok(journey.indexOf("s0.routeTrack") < journey.indexOf("s0.routeSummary"));
  assert.match(journey, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(journey, /timeTimelineRow|airportStopRow|timelineTrack|nonstop/);
});

test("outbound, return, and one-way cards use the same journey implementation", () => {
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} \/> : null\}/);
  assert.equal((source.match(/function FlightJourneyRow/g) || []).length, 1);
});

test("vertical correction has no offsets and preserves horizontal and data contracts", () => {
  assert.doesNotMatch(journey, /marginTop|translateY|\btop:/);
  assert.match(source, /departureColumn: \{ flexBasis: 62, minWidth: 62, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 82, minWidth: 82, flexShrink: 0 \}/);
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(journey, /const stopLabel = leg\.stops/);
  assert.match(journey, /theme\.textPrimary/);
  assert.match(journey, /theme\.textSecondary/);
  assert.match(source, /routeDot: \{ width: 6, height: 6, borderRadius: 3, flexShrink: 0 \}/);
});
