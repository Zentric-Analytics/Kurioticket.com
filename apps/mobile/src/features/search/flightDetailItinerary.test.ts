import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
const presentation = readFileSync(resolve("src/features/search/nativeFlightDetailsPresentation.ts"), "utf8");

test("authoritative native detail renders every server-supplied leg", () => {
  assert.match(source, /\(offer\.legs\?\.length \? offer\.legs : \[\]\)\.map/);
  assert.match(source, /<Itinerary key=/);
  assert.match(source, /leg\.direction === "outbound"/);
  assert.match(source, /nativeFormatDate\(leg\.departureTime/);
});

test("each itinerary card presents route, endpoint timing, duration, stop, and layover truth", () => {
  assert.match(source, /<AirportTime segment=\{firstSegment\} end="origin"/);
  assert.match(source, /<AirportTime segment=\{lastSegment\} end="destination"/);
  assert.match(source, /\{leg\.duration\} · \{nativeStopsLabel\(leg\.stops, technicalStops\)\}/);
  assert.match(source, /Connection: \{layover\.duration\} in \{layover\.airport\}/);
  assert.match(presentation, /nativeTechnicalStopCount/);
  assert.match(presentation, /nativeStopsLabel/);
});

test("airport endpoint enrichment exposes provider name, city, terminal, and timezone", () => {
  assert.match(source, /details\?\.name/);
  assert.match(source, /details\?\.cityName/);
  assert.match(source, /Terminal \{details\.terminal\}/);
  assert.match(source, /details\?\.timeZone/);
  assert.doesNotMatch(source, /fake|fixture|Terminal [A-Z0-9]"/i);
});

test("segments expose carrier identity, times, flight numbers, aircraft, distance, cabins, and technical-stop times", () => {
  assert.match(source, /<AirlineLogo airlineName=\{carrierName\}/);
  assert.match(source, /marketingFlightNumber \?\? segment\.flightNumber/);
  assert.match(source, /operatingFlightNumber/);
  assert.match(source, /nativeFormatTime\(segment\.departureTime/);
  assert.match(source, /nativeFormatTime\(segment\.arrivalTime/);
  assert.match(source, /segment\.distanceKm !== undefined/);
  assert.match(source, /segment\.aircraft\?\.iataCode/);
  assert.match(source, /segment\.cabinDetails\?\.map/);
  assert.match(source, /stop\.arrivalTime \? nativeFormatTime/);
  assert.match(source, /stop\.departureTime \? nativeFormatTime/);
});

test("multi-city summary uses the shared route helper instead of first and last offer fields only", () => {
  assert.match(source, /nativeFlightDetailsRoute\(details\)/);
  assert.match(presentation, /flightDetailsRouteLabel/);
  assert.match(presentation, /details\.search\.tripType/);
  assert.match(presentation, /details\.flight\.legs \?\? \[\]/);
});
