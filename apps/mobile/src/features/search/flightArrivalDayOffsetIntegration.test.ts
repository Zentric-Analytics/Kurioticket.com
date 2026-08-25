import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const journey = resultsSource.slice(resultsSource.indexOf("function FlightJourneyRow"), resultsSource.indexOf("function HotelCard"));
const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");

test("results never calculate or present arrival calendar crossing information", () => {
  assert.doesNotMatch(journey, /flightArrivalDayOffset|arrivalDayOffset|arrivalDayOffsetAccessibility/);
  assert.doesNotMatch(journey, /\+\$\{arrivalDayOffset\}|Next day|next day|days later/);
  assert.match(journey, /clock\(leg\.arrivalTime\)[\s\S]*leg\.destinationAirport/);
});

test("details present the actual provider-local arrival date without an offset", () => {
  assert.match(detailSource, /providerLocalArrivalDate\(leg\.departureTime, leg\.arrivalTime\)/);
  assert.match(detailSource, /`Arrives \$\{providerLocalArrivalDate/);
  assert.doesNotMatch(detailSource, /`\+\$\{/);
});
