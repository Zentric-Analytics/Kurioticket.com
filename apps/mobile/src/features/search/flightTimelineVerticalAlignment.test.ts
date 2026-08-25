import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));
const journey = source.slice(source.indexOf("function FlightJourneyRow"), source.indexOf("function HotelCard"));

test("departure time, timeline, and arrival time share one explicit vertical band", () => {
  const timeBand = journey.slice(journey.indexOf("<View style={s0.timeTimelineRow}>"), journey.indexOf("<View style={s0.airportStopRow}>"));
  assert.match(timeBand, /clock\(leg\.departureTime\)/);
  assert.match(timeBand, /style=\{s0\.timelineTrack\}/);
  assert.match(timeBand, /<PlaneTakeoff size=\{14\}/);
  assert.match(timeBand, /clock\(leg\.arrivalTime\)/);
  assert.match(source, /timeTimelineRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
});

test("duration and stops share the compact airport metadata band below the time anchor", () => {
  const lowerBand = journey.slice(journey.indexOf("<View style={s0.airportStopRow}>"));
  assert.match(lowerBand, /leg\.originAirport/);
  assert.match(lowerBand, /\{leg\.duration\} · \{stopLabel\}/);
  assert.match(lowerBand, /leg\.destinationAirport/);
  assert.doesNotMatch(journey, /durationRow/);
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
});
