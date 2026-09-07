import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { flightTripDetails, stripLegPrefix } from "./flightTripDetails";

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
    { category: "baggage", semantic: "positive", legDirection: "outbound", text: "Outbound: 1 carry-on included" },
    { category: "baggage", semantic: "positive", legDirection: "return", text: "Return: 1 checked bag included" },
    { category: "change", semantic: "negative", legDirection: "outbound", text: "Outbound: Changes not allowed before departure" },
    { category: "change", semantic: "negative", legDirection: "return", text: "Return: Changes allowed for a provider fee" },
    { category: "refund", semantic: "negative", text: "Outbound: Non-refundable." },
    { category: "refund", semantic: "informational", text: "Return: Provider refund rules apply" },
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
    { label: "Outbound", value: "Non-refundable." },
    { label: "Return", value: "Provider refund rules apply" },
  ]);
  assert.doesNotMatch(JSON.stringify(details), /Outbound:.*Return:/);
  assert.equal(details[1].legs, undefined);
  assert.equal(details[1].value, "Information unavailable");
});

test("prefixed authoritative cancellation terms do not remain one generic paragraph", () => {
  const cancellation = flightTripDetails(result({ fareTerms: [
    { category: "refund", semantic: "negative", text: "Outbound: Changes not allowed before departure." },
    { category: "refund", semantic: "negative", text: "Return: Changes not allowed before departure" },
  ] }))[3];

  assert.equal(cancellation.value, undefined);
  assert.deepEqual(cancellation.legs, [
    { label: "Outbound", value: "Changes not allowed before departure." },
    { label: "Return", value: "Changes not allowed before departure" },
  ]);
});

test("display prefix removal is leg-specific and preserves provider wording", () => {
  assert.equal(stripLegPrefix("Outbound: Changes not allowed.", "outbound"), "Changes not allowed.");
  assert.equal(stripLegPrefix("outbound:  Keep provider punctuation!", "outbound"), "Keep provider punctuation!");
  assert.equal(stripLegPrefix("Return: Changes not allowed", "outbound"), "Return: Changes not allowed");
  assert.equal(stripLegPrefix("The Return: fare is restricted", "return"), "The Return: fare is restricted");
});

const authoritativeDetail = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
const presentation = readFileSync(resolve("src/features/search/nativeFlightDetailsPresentation.ts"), "utf8");

test("authoritative Flight Details exposes fare rules in the dedicated Fare conditions surface", () => {
  assert.match(authoritativeDetail, /Fare conditions/);
  assert.match(authoritativeDetail, /provider\?\.conditions\?\.length/);
  assert.match(authoritativeDetail, /nativeConditionLabel\(condition\)/);
  assert.match(authoritativeDetail, /Penalty: \{nativeFormatSourceMoney/);
  assert.match(presentation, /Whole trip/);
  assert.match(presentation, /Outbound only/);
  assert.match(presentation, /Return only/);
  assert.match(presentation, /Flight \$\{condition\.legIndex \+ 1\}/);
});

test("fare-card term selection preserves baggage priority and negative change/refund truth", () => {
  assert.match(authoritativeDetail, /nativeCompactFareTerms\(choice\.distinguishingTerms, details\.search\.tripType\)/);
  assert.match(presentation, /fareTermSelectionPriority/);
  assert.match(presentation, /term\.semantic === "negative"/);
  assert.match(presentation, /term\.category === "baggage"/);
  assert.match(presentation, /each way/);
});

test("Fare details shows segment context, provider price breakdown, emissions, and missing-data truth", () => {
  assert.match(authoritativeDetail, /segment\.originAirport} → \{segment\.destinationAirport/);
  assert.match(authoritativeDetail, /Fare brand/);
  assert.match(authoritativeDetail, /Cabin class/);
  assert.match(authoritativeDetail, /Cabin product/);
  assert.match(authoritativeDetail, /Fare basis/);
  assert.match(authoritativeDetail, /Price breakdown/);
  assert.match(authoritativeDetail, /Price breakdown was not supplied by the provider/);
  assert.match(authoritativeDetail, /Estimated CO₂/);
});
