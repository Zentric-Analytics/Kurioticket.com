import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const journey = resultsSource.slice(resultsSource.indexOf("function FlightJourneyRow"), resultsSource.indexOf("function HotelCard"));
const detailSource = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("results never calculate or present arrival calendar crossing information", () => {
  assert.doesNotMatch(journey, /flightArrivalDayOffset|arrivalDayOffset|arrivalDayOffsetAccessibility/);
  assert.doesNotMatch(journey, /\+\$\{arrivalDayOffset\}|Next day|next day|days later/);
  assert.match(journey, /clock\(leg\.arrivalTime\)[\s\S]*leg\.destinationAirport/);
});

test("details present authoritative local date and times without invented offsets", () => {
  assert.match(detailSource, /Intl\.DateTimeFormat\([^)]*,\{month:"short",day:"numeric",year:"numeric"\}\)\.format\(new Date\(leg\.departureTime\)\)/);
  assert.match(detailSource, /clock\(leg\.arrivalTime\)/);
  assert.doesNotMatch(detailSource, /`\+\$\{/);
});
