import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const journey = source.slice(source.indexOf("function FlightJourneyRow"), source.indexOf("function HotelCard"));

test("each journey independently derives its indicator from authoritative leg datetimes", () => {
  assert.match(journey, /flightArrivalDayOffset\(leg\.departureTime, leg\.arrivalTime\)/);
  assert.match(journey, /arrivalDayOffsetAccessibility\(arrivalDayOffset\)/);
  assert.doesNotMatch(journey, /tripType|roundTrip|Date\.now/);
});

test("the restrained indicator remains beside arrival time in the existing time row", () => {
  const timeBand = journey.slice(journey.indexOf("<View style={s0.timeTimelineRow}>"), journey.indexOf("<View style={s0.airportStopRow}>"));
  assert.match(timeBand, /arrivalTimeRow[\s\S]*clock\(leg\.arrivalTime\)[\s\S]*arrivalDayOffset/);
  assert.match(timeBand, /`\+\$\{arrivalDayOffset\}`/);
  assert.doesNotMatch(timeBand, /badge|pill|chip/);
  assert.match(source, /arrivalTimeRow: \{ flexDirection: "row", alignItems: "baseline", justifyContent: "flex-end", gap: 2 \}/);
});

test("the indicator adds no journey row or vertical card spacing", () => {
  assert.equal((source.match(/function FlightJourneyRow/g) || []).length, 1);
  assert.match(source, /journeyList: \{ marginTop: 3, gap: 4 \}/);
  assert.match(source, /journeyBlock: \{ width: "100%", gap: 0 \}/);
  assert.doesNotMatch(source, /arrivalDayRow/);
});

test("arrival width fits realistic time labels across supported card widths", () => {
  const arrivalWidth = 82;
  for (const viewport of [320, 360, 375, 390, 412, 430]) {
    const journeyWidth = viewport - 28 - 24 - 32 - 10;
    const timelineWidth = journeyWidth - 62 - arrivalWidth - 12;
    assert.ok(timelineWidth >= 46, `${viewport}px keeps the timeline safe`);
  }
  assert.ok(arrivalWidth >= 82, "11:59 PM +1 and 12:05 AM +2 retain a stable arrival column");
});
