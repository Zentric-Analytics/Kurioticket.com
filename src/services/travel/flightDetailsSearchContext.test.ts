import assert from "node:assert/strict";
import test from "node:test";
import { parseFlightDetailsSearch, searchRecordToParams } from "./flightDetailsSearchContext";

const valid = new URLSearchParams({
  tripType: "round-trip", origin: "LHR", destination: "JFK",
  departureDate: "2027-01-01", returnDate: "2027-01-08",
  adults: "2", children: "1", infants: "0", cabinClass: "economy",
});

test("parses the complete Results context used for provider revalidation", () => {
  assert.deepEqual(parseFlightDetailsSearch(valid), {
    tripType: "round-trip", origin: "LHR", destination: "JFK",
    departureDate: "2027-01-01", returnDate: "2027-01-08",
    adults: 2, children: 1, infants: 0, travelers: 3, cabinClass: "economy",
  });
});

test("rejects incomplete or invented flight context", () => {
  for (const key of ["origin", "returnDate", "adults", "children", "infants", "cabinClass"]) {
    const candidate = new URLSearchParams(valid);
    candidate.delete(key);
    assert.equal(parseFlightDetailsSearch(candidate), null, key);
  }
  const unsafe = searchRecordToParams({ origin: "LHR", adults: 1, nested: {}, destination: "JFK" });
  assert.equal(unsafe.get("origin"), "LHR");
  assert.equal(unsafe.has("adults"), false);
});
