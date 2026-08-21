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
  assert.deepEqual(details[0], { label: "Baggage", icon: "baggage", value: "Outbound: 1 carry-on included; checked baggage not supplied" });
  assert.equal(details[0].legs, undefined);
  assert.equal(details.some(({ label }) => label === "Carry-on bag" || label === "Checked bag"), false);
  assert.doesNotMatch(details.map(({ value }) => value).join(" "), /checked bag included/i);
});

test("seat availability is claimed only for explicit normalized provider states", () => {
  assert.deepEqual(flightTripDetails(result())[1], { label: "Seat selection", icon: "seat", value: "Information unavailable" });
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
  assert.deepEqual(details[2], { label: "Changes", icon: "changes", value: "Changes not allowed before departure" });
  assert.deepEqual(details[3], { label: "Cancellation", icon: "cancellation", value: "Refundable with USD 50 penalty" });
  assert.deepEqual(flightTripDetails(result({ baggageInfo: "", refundInfo: "" })), [
    { label: "Baggage", icon: "baggage", value: "Information unavailable" },
    { label: "Seat selection", icon: "seat", value: "Information unavailable" },
    { label: "Changes", icon: "changes", value: "Fare rules apply" },
    { label: "Cancellation", icon: "cancellation", value: "Provider rules apply" },
  ]);
});

test("leg-scoped provider terms become separate outbound and return blocks", () => {
  const details = flightTripDetails(result({ fareTerms: [
    { category: "baggage", semantic: "positive", legDirection: "outbound", text: "1 carry-on included" },
    { category: "baggage", semantic: "positive", legDirection: "return", text: "1 checked bag included" },
    { category: "change", semantic: "negative", legDirection: "outbound", text: "Changes not allowed before departure" },
    { category: "change", semantic: "negative", legDirection: "return", text: "Changes allowed for a provider fee" },
    { category: "refund", semantic: "negative", legDirection: "outbound", text: "Non-refundable" },
    { category: "refund", semantic: "informational", legDirection: "return", text: "Provider refund rules apply" },
  ] }));

  assert.deepEqual(details[0].legs, [
    { label: "Outbound", value: "1 carry-on included" },
    { label: "Return", value: "1 checked bag included" },
  ]);
  assert.deepEqual(details[2].legs, [
    { label: "Outbound", value: "Changes not allowed before departure" },
    { label: "Return", value: "Changes allowed for a provider fee" },
  ]);
  assert.deepEqual(details[3].legs, [
    { label: "Outbound", value: "Non-refundable" },
    { label: "Return", value: "Provider refund rules apply" },
  ]);
  assert.doesNotMatch(JSON.stringify(details), /Outbound:.*Return:/);
  assert.equal(details[1].legs, undefined);
  assert.equal(details[1].value, "Information unavailable");
});

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const tripCard = flightDetail.slice(flightDetail.indexOf(">Trip details<"), flightDetail.indexOf(">Booking provider<"));
const detailsRow = source.slice(source.indexOf("function DetailsRow"), source.indexOf("function BookingProviderCard"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));

test("Trip details removes its duplicate total while both booking prices remain", () => {
  assert.doesNotMatch(flightDetail, />Fare summary</);
  assert.match(tripCard, />Trip details</);
  assert.doesNotMatch(tripCard, /formattedFare|Total \(1 traveler\)|Taxes and fees per provider/);
  assert.match(flightDetail, /<BookingProviderCard[\s\S]*?price=\{formattedFare\}/);
  assert.match(flightDetail, /d\.stickyTotal[\s\S]*?\{formattedFare\}/);
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 2);
});

test("details values stack, wrap naturally, and remain accessible", () => {
  assert.match(tripCard, /flightTripDetails\(result\)\.map/);
  assert.match(detailsRow, /accessibilityLabel=\{`\$\{label\}\. \$\{accessibilityValue\}`\}/);
  assert.match(detailsRow, /legs\.map[\s\S]*?d\.detailLegLabel[\s\S]*?d\.detailValue/);
  assert.doesNotMatch(detailsRow, /numberOfLines/);
  assert.match(styles, /detailValue: \{[^}]*flexShrink: 1,[^}]*minWidth: 0/);
});

test("category headings use small non-focusable repository Lucide icons without emoji", () => {
  assert.match(source, /import \{[^}]*Armchair[^}]*Luggage[^}]*Repeat2[^}]*ShieldX[^}]*\} from "lucide-react-native"/);
  assert.match(detailsRow, /<DetailIcon accessible=\{false\} color=\{ui\.blue\} size=\{17\}/);
  assert.doesNotMatch(tripCard, /[\p{Extended_Pictographic}]/u);
});

test("the single themed card uses elevation and spacing rather than borders", () => {
  assert.match(flightDetail, /d\.tripDetails, \{ backgroundColor: theme\.surface \}, theme\.dark && d\.tripDetailsDark/);
  assert.match(styles, /tripDetails: \{[\s\S]*?borderRadius: 13,[\s\S]*?shadowOpacity: 0\.1,[\s\S]*?elevation: 3/);
  const rowStyle = styles.slice(styles.indexOf("detailRow:"), styles.indexOf("detailLabel:"));
  assert.doesNotMatch(rowStyle, /border|justifyContent/);
  const legStyles = styles.slice(styles.indexOf("detailLegs:"), styles.indexOf("detailGenericValue:"));
  assert.doesNotMatch(legStyles, /border|height: 1/);
  assert.doesNotMatch(tripCard, /View fare rules/);
});
