import assert from "node:assert/strict";
import test from "node:test";
import {
  formatFlightCardBaggage,
  isUnavailableBaggageInformation,
} from "./flightCardBaggage";

const labels = {
  checkProvider: "Check provider",
  carryOnIncluded: "Carry-on included",
};

test("unavailable baggage variants use the concise localized fallback", () => {
  for (const value of [
    undefined,
    null,
    "",
    "Baggage details not supplied by the provider",
    "Baggage information unavailable",
    "Baggage allowance not supplied",
    "Review baggage with provider",
    "Outbound: baggage allowance not supplied for one or more passengers",
    "Rules vary by fare",
  ]) {
    assert.equal(formatFlightCardBaggage(value, labels), "Check provider");
  }
});

test("truthful baggage allowances remain unchanged", () => {
  assert.equal(formatFlightCardBaggage("carry-on included", labels), "Carry-on included");
  assert.equal(formatFlightCardBaggage("1 checked bag included", labels), "1 checked bag included");
  assert.equal(formatFlightCardBaggage("2 bags", labels), "2 bags");
  assert.equal(formatFlightCardBaggage("No checked baggage", labels), "No checked baggage");
});

test("baggage fallback is semantic and independent of airline identity", () => {
  assert.equal(isUnavailableBaggageInformation("Baggage information unavailable"), true);
  assert.equal(isUnavailableBaggageInformation("1 checked bag included"), false);
});
