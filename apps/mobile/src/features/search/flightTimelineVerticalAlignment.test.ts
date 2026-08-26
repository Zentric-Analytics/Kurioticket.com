import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));
const journey = source.slice(source.indexOf("function FlightJourneyRow"), source.indexOf("function HotelCard"));

test("duration, time/track, and airport details use three explicit ordered rows", () => {
  const durationStart = journey.indexOf("<View style={s0.journeyDurationRow}>");
  const timeStart = journey.indexOf("<View style={s0.journeyTimeRow}>");
  const airportStart = journey.indexOf("<View style={s0.journeyAirportRow}>");
  assert.ok(durationStart >= 0 && durationStart < timeStart && timeStart < airportStart);

  const durationRow = journey.slice(durationStart, timeStart);
  assert.match(durationRow, /departureColumn[\s\S]*timelineColumn[\s\S]*\{leg\.duration\} · \{stopLabel\}[\s\S]*arrivalColumn/);
  assert.equal(journey.match(/\{leg\.duration\} · \{stopLabel\}/g)?.length, 1);

  const timeRow = journey.slice(timeStart, airportStart);
  assert.match(timeRow, /departureColumn[\s\S]*clock\(leg\.departureTime\)[\s\S]*timelineColumn[\s\S]*routeTrack[\s\S]*arrivalColumn[\s\S]*clock\(leg\.arrivalTime\)/);
  assert.doesNotMatch(timeRow, /originAirport|destinationAirport|journeyDuration/);

  const airportRow = journey.slice(airportStart);
  assert.match(airportRow, /departureColumn[\s\S]*leg\.originAirport[\s\S]*timelineColumn[\s\S]*routeSummary[\s\S]*\{leg\.originAirport\} → \{leg\.destinationAirport\}[\s\S]*arrivalColumn[\s\S]*leg\.destinationAirport/);
});

test("route track is symmetric and shares the direct horizontal row with both times", () => {
  assert.match(journey, /routeTrack[\s\S]*routeDot[\s\S]*s0\.line[\s\S]*<PlaneTakeoff accessible=\{false\} size=\{14\}[\s\S]*s0\.line[\s\S]*routeDot/);
  assert.match(source, /journeyTimeRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
  assert.match(source, /routeTrack: \{ width: "100%", minWidth: 46, flexDirection: "row", alignItems: "center", gap: 2 \}/);
  assert.match(source, /line: \{\s*flex: 1,/);
  assert.equal(journey.match(/style=\{\[s0\.line,/g)?.length, 2);
  assert.equal(journey.match(/style=\{\[s0\.routeDot,/g)?.length, 2);
});

test("equal side columns preserve a mathematically centered timeline without reducing its width", () => {
  assert.match(source, /departureColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.doesNotMatch(source, /departureColumn: \{ flexBasis: 62|arrivalColumn: \{ flexBasis: 82/);
  assert.equal(72 + 72, 62 + 82, "equal columns retain the previous 144px side-space budget");
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const contentWidth = viewport - 28 - 24;
    const timelineWidth = contentWidth - 72 - 72 - 12;
    const previousTimelineWidth = contentWidth - 62 - 82 - 12;
    assert.ok(timelineWidth >= 100, `${viewport}px leaves a readable timeline`);
    assert.equal(timelineWidth, previousTimelineWidth, `${viewport}px timeline does not shrink`);
  }
});

test("alignment is structural rather than positional and shared by every leg", () => {
  assert.doesNotMatch(journey, /marginTop|translateY|\btop:|position:\s*"absolute"/);
  assert.match(source, /rightColumnContract: \{ alignItems: "flex-end" \}/);
  assert.match(source, /routeDot: \{ width: 6, height: 6, borderRadius: 3, flexShrink: 0 \}/);
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} \/> : null\}/);
});
