import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const itinerary = flightDetail.slice(flightDetail.indexOf("d.itinerarySection"), flightDetail.indexOf(">Trip details<"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));

test("the unified itinerary maps only authoritative legs and supports one-way and round trips", () => {
  assert.match(itinerary, /\{legs\.map\(\(leg, i\) => \(/);
  assert.match(itinerary, /leg\.direction\.toUpperCase\(\)/);
  assert.match(itinerary, /new Date\(leg\.departureTime\)\.toLocaleDateString\("en-US", \{[\s\S]*?month: "short",[\s\S]*?day: "numeric"/);
  assert.doesNotMatch(itinerary, /weekday:|RETURN|Return/);
  assert.match(flightDetail, /const legs = result\.legs\?\.length\s*\? result\.legs\s*:\s*\[[\s\S]*?direction: "outbound" as const/);
});

test("each leg keeps the existing airline identity and all authoritative route values", () => {
  assert.match(itinerary, /<AirlineLogo[\s\S]*?airlineName=\{result\.airlineName\}[\s\S]*?logoUrl=\{result\.airlineLogo\}/);
  assert.match(itinerary, /\{result\.airlineName\}[\s\S]*?result\.flightNumber \? `  ·  \$\{result\.flightNumber\}` : ""/);
  assert.match(itinerary, /clock\(leg\.departureTime\)/);
  assert.match(itinerary, /clock\(leg\.arrivalTime\)/);
  assert.match(itinerary, /\{leg\.originAirport\}/);
  assert.match(itinerary, /\{leg\.destinationAirport\}/);
  assert.match(itinerary, /\{leg\.duration\}/);
  assert.match(itinerary, /leg\.stops[\s\S]*?`\$\{leg\.stops\} stop\$\{leg\.stops > 1 \? "s" : ""\}`[\s\S]*?: "Nonstop"/);
  assert.match(itinerary, /leg\.layovers\?\.length[\s\S]*?\.map\(\(x\) => `\$\{x\.airport\} · \$\{x\.duration\}`\)/);
});

test("duration, timeline times, and airport/stop details use explicit vertical bands", () => {
  const duration = itinerary.indexOf("d.routeDurationRow");
  const timeline = itinerary.indexOf("d.legRoute");
  const details = itinerary.indexOf("d.routeDetailsRow");
  assert.ok(duration > -1 && duration < timeline && timeline < details);
  const timelineBand = itinerary.slice(timeline, details);
  assert.match(timelineBand, /clock\(leg\.departureTime\)[\s\S]*?<FlowIcon name="flight"[\s\S]*?clock\(leg\.arrivalTime\)/);
  assert.match(styles, /legRoute: \{ flexDirection: "row", alignItems: "center"/);
  assert.match(styles, /middle: \{ flex: 1, minWidth: 56, flexDirection: "row", alignItems: "center"/);
  assert.match(styles, /routeEdge: \{ width: 82/);
});

test("the itinerary is one elevated themed card without bordered leg cards", () => {
  assert.match(itinerary, /d\.itinerarySection, \{ backgroundColor: theme\.surface \}, theme\.dark && d\.itinerarySectionDark/);
  assert.match(styles, /itinerarySection: \{[\s\S]*?borderRadius: 13,[\s\S]*?shadowOpacity: 0\.1,[\s\S]*?elevation: 3/);
  const legStyle = styles.slice(styles.indexOf("leg:"), styles.indexOf("legSpacing:"));
  assert.doesNotMatch(legStyle, /border|shadow|backgroundColor|padding/);
  assert.match(styles, /itinerarySectionDark: \{ shadowOpacity: 0\.28, elevation: 2 \}/);
});

test("the completed header, trip details, and booking sections remain in place", () => {
  assert.match(flightDetail, /accessibilityLabel="Flight details header"/);
  assert.match(flightDetail, /accessibilityLabel="Go back"/);
  assert.match(flightDetail, /accessibilityLabel="Edit search"/);
  assert.match(flightDetail, /accessibilityLabel="Share flight"/);
  assert.match(flightDetail, />Trip details</);
  assert.match(flightDetail, />Booking provider</);
  assert.match(flightDetail, /Continue to \$\{provider\}/);
});
