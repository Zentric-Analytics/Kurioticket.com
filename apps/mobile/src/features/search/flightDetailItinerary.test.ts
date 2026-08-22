import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const itinerary = flightDetail.slice(flightDetail.indexOf("<View style={[d.section"), flightDetail.indexOf(">Trip details<"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));

test("the itinerary maps authoritative legs for one-way and round trips", () => {
  assert.match(itinerary, /\{legs\.map\(\(leg, i\) => \(/);
  assert.match(itinerary, /leg\.direction\.toUpperCase\(\)/);
  assert.match(itinerary, /new Date\(leg\.departureTime\)\.toLocaleDateString\("en-US", \{[\s\S]*?weekday: "short",[\s\S]*?month: "short",[\s\S]*?day: "numeric"/);
  assert.doesNotMatch(itinerary, /direction: "return"|>RETURN</);
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

test("each leg uses the previous departure, middle timeline, and arrival columns", () => {
  assert.match(itinerary, /<View style=\{d\.legRoute\}>[\s\S]*?<View style=\{\{ flex: 1, minWidth: 0 \}\}>[\s\S]*?clock\(leg\.departureTime\)[\s\S]*?leg\.originAirport[\s\S]*?<View style=\{d\.middle\}>[\s\S]*?leg\.duration[\s\S]*?d\.line[\s\S]*?leg\.stops[\s\S]*?<View style=\{\{ flex: 1, alignItems: "flex-end" \}\}>[\s\S]*?clock\(leg\.arrivalTime\)[\s\S]*?leg\.destinationAirport/);
  assert.match(styles, /legRoute: \{ flexDirection: "row", alignItems: "center" \}/);
  assert.match(styles, /middle: \{ width: 120, alignItems: "center" \}/);
  assert.match(styles, /line: \{[\s\S]*?height: 1,[\s\S]*?width: "100%",[\s\S]*?marginVertical: 7/);
  assert.doesNotMatch(itinerary, /d\.(?:routeDurationRow|routeDetailsRow|routeEdge|routeCenter|routeArrival|plane)/);
  assert.doesNotMatch(itinerary, /<FlowIcon name="flight"/);
});

test("the standard section contains individually bordered and shadowed leg cards", () => {
  assert.match(itinerary, /d\.section, \{ backgroundColor: theme\.surface, borderColor: theme\.border \}/);
  assert.match(itinerary, /d\.leg, \{ backgroundColor: theme\.dark \? "#17243A" : theme\.surface, borderColor: theme\.border \}/);
  const legStyle = styles.slice(styles.indexOf("leg:"), styles.indexOf("blue:"));
  assert.match(legStyle, /borderWidth: 1,[\s\S]*?borderRadius: 11,[\s\S]*?padding: 14,[\s\S]*?shadowOpacity: 0\.06,[\s\S]*?shadowRadius: 8/);
  assert.doesNotMatch(styles, /itinerarySection|legSpacing|routeDurationRow|routeDetailsRow|routeEdge|routeCenter|routeArrival|plane:/);
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
