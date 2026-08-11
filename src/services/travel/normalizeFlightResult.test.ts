import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams } from "@/lib/types";
import { normalizeFlightResult } from "./normalizeFlightResult";

const search = (
  tripType: FlightSearchParams["tripType"],
): FlightSearchParams => ({
  tripType,
  origin: "LHR",
  destination: "JFK",
  departureDate: "2027-01-01",
  ...(tripType === "round-trip" ? { returnDate: "2027-01-08" } : {}),
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
});
const slice = (
  origin: string,
  destination: string,
  departure: string,
  arrival: string,
) => ({
  duration: "PT8H",
  segments: [
    {
      id: `${origin}-${destination}`,
      departing_at: departure,
      arriving_at: arrival,
      origin: { iata_code: origin },
      destination: { iata_code: destination },
      marketing_carrier: { name: "Example Air", iata_code: "EX" },
      marketing_carrier_flight_number: "101",
      passengers: [
        {
          cabin_class: "economy",
          baggages: [{ type: "checked", quantity: 1 }],
        },
      ],
    },
  ],
});
const offer = () => ({
  id: "off-1",
  expires_at: "2027-01-01T00:00:00.000Z",
  total_amount: "700.25",
  total_currency: "EUR",
  conditions: {
    refund_before_departure: { allowed: true },
    change_before_departure: { allowed: false },
  },
  slices: [slice("LHR", "JFK", "2027-01-01T08:00:00Z", "2027-01-01T16:00:00Z")],
});

test("normalizes a complete one-way Duffel provider offer", () => {
  const result = normalizeFlightResult("Duffel", offer(), search("one-way"));
  assert.ok(result);
  assert.equal(result.providerOfferId, "off-1");
  assert.equal(
    result.providerExpiresAt,
    Date.parse("2027-01-01T00:00:00.000Z"),
  );
  assert.equal(result.price, 700.25);
  assert.equal(result.currency, "EUR");
  assert.equal(result.legs?.length, 1);
  assert.match(result.baggageInfo, /checked bag/);
  assert.match(result.refundInfo, /Refundable/);
});

test("normalizes both legs of a round-trip offer", () => {
  const raw = offer();
  raw.slices.push(
    slice("JFK", "LHR", "2027-01-08T10:00:00Z", "2027-01-08T18:00:00Z"),
  );
  const result = normalizeFlightResult("Duffel", raw, search("round-trip"));
  assert.deepEqual(
    result?.legs?.map((leg) => leg.direction),
    ["outbound", "return"],
  );
  assert.equal(result?.providerOfferId, "off-1");
});

test("rejects missing or invalid provider identity and expiry", () => {
  assert.equal(
    normalizeFlightResult(
      "Duffel",
      { ...offer(), id: undefined },
      search("one-way"),
    ),
    null,
  );
  assert.equal(
    normalizeFlightResult(
      "Duffel",
      { ...offer(), expires_at: undefined },
      search("one-way"),
    ),
    null,
  );
  assert.equal(
    normalizeFlightResult(
      "Duffel",
      { ...offer(), expires_at: "not-a-date" },
      search("one-way"),
    ),
    null,
  );
});

test("rejects a round-trip offer missing its return leg without synthesizing identity", () => {
  assert.equal(
    normalizeFlightResult("Duffel", offer(), search("round-trip")),
    null,
  );
});
