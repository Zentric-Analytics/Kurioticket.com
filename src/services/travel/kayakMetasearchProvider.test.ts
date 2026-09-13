import assert from "node:assert/strict";
import test from "node:test";
import { kayakProviderCriteria } from "./kayakMetasearchProvider";
import { resolveRegularKayakSearch } from "./kayakRegularSearch";

test("canonical flight criteria retain scalars without corrupting structured legs", async () => {
  const criteria = kayakProviderCriteria({
    tripType: "round-trip",
    origin: "BOS",
    destination: "JFK",
    departureDate: "2027-10-12",
    returnDate: "2027-10-17",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
    currency: "USD",
    legs: [
      { origin: "BOS", destination: "JFK", departureDate: "2027-10-12" },
      { origin: "JFK", destination: "BOS", departureDate: "2027-10-17" },
    ],
  });

  assert.equal("legs" in criteria, false);
  assert.equal(criteria.adults, "1");
  const resolved = await resolveRegularKayakSearch("flights", criteria, async () => []);
  assert.equal(resolved.supported, true);
  if (resolved.supported) assert.deepEqual(resolved.search, {
    vertical: "flights", origin: "BOS", destination: "JFK",
    departure: "2027-10-12", returnDate: "2027-10-17", adults: 1,
  });
});
