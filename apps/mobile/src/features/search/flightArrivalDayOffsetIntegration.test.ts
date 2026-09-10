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

test("details present provider-local full and endpoint dates without visible calendar-day offsets", () => {
  assert.match(detailSource, /providerLocalFlightDateLong\(leg\.departureTime\)/);
  assert.match(detailSource, /providerLocalFlightDate\(leg\.departureTime\)/);
  assert.match(detailSource, /providerLocalFlightDate\(leg\.arrivalTime\)/);
  assert.match(detailSource, /clock\(leg\.arrivalTime\)/);
  assert.doesNotMatch(detailSource, /flightArrivalDayOffset\(leg\.departureTime,leg\.arrivalTime\)/);
  assert.doesNotMatch(detailSource, /\+\{arrivalDayOffset\}/);
});
