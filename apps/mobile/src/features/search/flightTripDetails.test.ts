import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { flightTripDetails } from "./flightTripDetails";

const result = (patch: Partial<FlightResult> = {}) => ({
  baggageInfo: "Outbound: 1 carry-on included; checked baggage not supplied",
  refundInfo: "Provider combined change and refund text",
  ...patch,
} as FlightResult);

test("trip details preserve generic provider baggage and do not invent separate bag allowances", () => {
  const details = flightTripDetails(result());
  assert.deepEqual(details[0], { label: "Baggage", value: "Outbound: 1 carry-on included; checked baggage not supplied" });
  assert.equal(details.some(({ label }) => label === "Carry-on bag" || label === "Checked bag"), false);
  assert.doesNotMatch(details.map(({ value }) => value).join(" "), /checked bag included/i);
});

test("seat availability is claimed only for explicit normalized provider states", () => {
  assert.deepEqual(flightTripDetails(result())[1], { label: "Seat selection", value: "Information unavailable" });
  const available = flightTripDetails(result({ providerDetails: { conditions: [{ category: "advance-seat-selection", scope: "trip", state: "allowed" }] } }))[1];
  const unavailable = flightTripDetails(result({ providerDetails: { conditions: [{ category: "advance-seat-selection", scope: "trip", state: "not-allowed" }] } }))[1];
  assert.equal(available.value, "Available");
  assert.equal(unavailable.value, "Unavailable");
});

test("authoritative change and refund terms take precedence over truthful fallbacks", () => {
  const details = flightTripDetails(result({ fareTerms: [
    { category: "change", semantic: "negative", text: "Changes not allowed before departure" },
    { category: "refund", semantic: "positive", text: "Refundable with USD 50 penalty" },
  ] }));
  assert.deepEqual(details[2], { label: "Changes", value: "Changes not allowed before departure" });
  assert.deepEqual(details[3], { label: "Cancellation", value: "Refundable with USD 50 penalty" });
  assert.deepEqual(flightTripDetails(result({ baggageInfo: "", refundInfo: "" })), [
    { label: "Baggage", value: "Information unavailable" },
    { label: "Seat selection", value: "Information unavailable" },
    { label: "Changes", value: "Fare rules apply" },
    { label: "Cancellation", value: "Provider rules apply" },
  ]);
});

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const tripCard = flightDetail.slice(flightDetail.indexOf(">Trip details<"), flightDetail.indexOf(">Choose where to book<"));
const detailsRow = source.slice(source.indexOf("function DetailsRow"), source.indexOf("function Offer"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));

test("Trip details removes its duplicate total while both booking prices remain", () => {
  assert.doesNotMatch(flightDetail, />Fare summary</);
  assert.match(tripCard, />Trip details</);
  assert.doesNotMatch(tripCard, /formattedFare|Total \(1 traveler\)|Taxes and fees per provider/);
  assert.match(flightDetail, /<Offer[\s\S]*?price=\{formattedFare\}/);
  assert.match(flightDetail, /d\.stickyTotal[\s\S]*?\{formattedFare\}/);
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 2);
});

test("details values stack, wrap naturally, and remain accessible", () => {
  assert.match(tripCard, /flightTripDetails\(result\)\.map/);
  assert.match(detailsRow, /accessibilityLabel=\{`\$\{label\}\. \$\{value\}`\}/);
  assert.match(detailsRow, /d\.detailLabel[\s\S]*?d\.detailValue/);
  assert.doesNotMatch(detailsRow, /flexDirection: "row"|space-between|numberOfLines/);
});

test("the single themed card uses elevation and spacing rather than borders", () => {
  assert.match(flightDetail, /d\.tripDetails, \{ backgroundColor: theme\.surface \}, theme\.dark && d\.tripDetailsDark/);
  assert.match(styles, /tripDetails: \{[\s\S]*?borderRadius: 13,[\s\S]*?shadowOpacity: 0\.1,[\s\S]*?elevation: 3/);
  const rowStyle = styles.slice(styles.indexOf("detailRow:"), styles.indexOf("detailLabel:"));
  assert.doesNotMatch(rowStyle, /border|flexDirection|justifyContent/);
  assert.doesNotMatch(tripCard, /View fare rules/);
});
