import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const itinerary = flightDetail.slice(flightDetail.indexOf("type FlightItineraryLegProps"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));

test("the detail screen delegates every authoritative leg to the web-aligned itinerary card", () => {
  assert.match(flightDetail, /\{legs\.map\(\(leg, i\) => <FlightItineraryLeg/);
  assert.match(itinerary, /leg\.direction\.toUpperCase\(\)/);
  assert.match(itinerary, /itineraryDate\(leg\.departureTime\)/);
  assert.match(flightDetail, /const legs = result\.legs\?\.length\s*\? result\.legs\s*:\s*\[[\s\S]*?direction: "outbound" as const/);
});

test("each itinerary card presents canonical route, timing, duration, stop, and layover truth", () => {
  assert.match(itinerary, /clock\(leg\.departureTime\)/);
  assert.match(itinerary, /clock\(leg\.arrivalTime\)/);
  assert.match(itinerary, /leg\.originAirport/);
  assert.match(itinerary, /leg\.destinationAirport/);
  assert.match(itinerary, /\{leg\.duration\}/);
  assert.match(itinerary, /leg\.stops === 0[\s\S]*?"Nonstop"/);
  assert.match(itinerary, /leg\.layovers\.map\(\(layover\) => `\$\{layover\.duration\} in \$\{layover\.airport\}`\)/);
});

test("airport and segment enrichment use provider data first and factual catalogue fallbacks", () => {
  assert.match(itinerary, /firstSegment\?\.originDetails/);
  assert.match(itinerary, /lastSegment\?\.destinationDetails/);
  assert.match(itinerary, /details\?\.name \?\? catalogue\?\.airport \?\? code/);
  assert.match(itinerary, /details\?\.cityName \?\? catalogue\?\.city \?\? ""/);
  assert.match(itinerary, /details\?\.terminal \?/);
  assert.match(itinerary, /firstSegment\?\.distanceKm \?/);
  assert.doesNotMatch(itinerary, /fake|fixture|Terminal [A-Z0-9]"/i);
});

test("each leg uses the rendered-web endpoint, journey-line, and segment-summary hierarchy", () => {
  assert.match(itinerary, /d\.itineraryEndpoint/);
  assert.match(itinerary, /d\.itineraryJourney/);
  assert.match(itinerary, /d\.itineraryLineRow/);
  assert.match(itinerary, /<FlowIcon name="flight"/);
  assert.match(itinerary, /d\.segmentSummary/);
  assert.match(itinerary, /<AirlineLogo airlineName=\{airlineName\} logoUrl=\{result\.airlineLogo\}/);
  assert.match(styles, /itineraryCard: \{ borderWidth: 1,[\s\S]*?borderRadius: 12,[\s\S]*?padding: 14/);
});

test("the aligned itinerary keeps canonical trip, provider, and sticky booking sections", () => {
  assert.match(flightDetail, /accessibilityLabel="Back to results"/);
  assert.match(flightDetail, /accessibilityLabel="Edit search"/);
  assert.match(flightDetail, /accessibilityLabel="Share flight"/);
  assert.match(flightDetail, />Trip details</);
  assert.match(flightDetail, />Booking provider</);
  assert.match(flightDetail, /Continue to \$\{provider\}/);
  assert.doesNotMatch(flightDetail, />Best overall</);
});
