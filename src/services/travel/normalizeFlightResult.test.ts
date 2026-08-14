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
      marketing_carrier: {
        name: "Example Air",
        iata_code: "EX",
        logo_symbol_url: "https://assets.duffel.com/airlines/EX.svg",
        logo_lockup_url: "https://assets.duffel.com/airlines/EX-lockup.svg",
      },
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
  assert.equal(result.airlineName, "Example Air");
  assert.equal(
    result.airlineLogo,
    "https://assets.duffel.com/airlines/EX.svg",
  );
  assert.equal(result.legs?.length, 1);
  assert.match(result.baggageInfo, /checked bag/);
  assert.match(result.refundInfo, /Refundable/);
});

test("keeps the logo aligned with the displayed Duffel carrier identity", () => {
  const raw = offer();
  const segment = raw.slices[0].segments[0];
  Object.assign(segment, {
    marketing_carrier: {
      name: "British Airways",
      iata_code: "BA",
      logo_lockup_url: "https://assets.duffel.com/airlines/BA-lockup.svg",
    },
    operating_carrier: {
      name: "American Airlines",
      iata_code: "AA",
      logo_symbol_url: "https://assets.duffel.com/airlines/AA.svg",
    },
  });

  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(result?.airlineName, "British Airways");
  assert.equal(
    result?.airlineLogo,
    "https://assets.duffel.com/airlines/BA-lockup.svg",
  );
});

test("uses an equivalent owner carrier logo when the segment copy omits assets", () => {
  const raw = offer();
  Object.assign(raw.slices[0].segments[0], {
    marketing_carrier: {
      id: "arl_british_airways",
      name: "British Airways",
      iata_code: "BA",
    },
  });
  Object.assign(raw, {
    owner: {
      id: "arl_british_airways",
      name: "British Airways",
      iata_code: "BA",
      logo_symbol_url:
        "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
    },
  });

  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(result?.airlineName, "British Airways");
  assert.equal(
    result?.airlineLogo,
    "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
  );
});

test("does not borrow the offer owner's logo for a different marketing carrier", () => {
  const raw = offer();
  Object.assign(raw.slices[0].segments[0], {
    marketing_carrier: {
      name: "Qatar Airways",
      iata_code: "QR",
    },
  });
  Object.assign(raw, {
    owner: {
      name: "British Airways",
      iata_code: "BA",
      logo_symbol_url:
        "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
    },
  });

  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(result?.airlineName, "Qatar Airways");
  assert.equal(result?.airlineLogo, null);
});

test("falls back through operating carrier and owner without mixing logos", () => {
  const raw = offer();
  const segment = raw.slices[0].segments[0];
  Object.assign(segment, {
    marketing_carrier: undefined,
    operating_carrier: {
      name: "Lufthansa",
      iata_code: "LH",
      logo_symbol_url: "https://assets.duffel.com/airlines/LH.svg",
    },
  });
  assert.equal(
    normalizeFlightResult("Duffel", raw, search("one-way"))?.airlineLogo,
    "https://assets.duffel.com/airlines/LH.svg",
  );

  Object.assign(segment, { operating_carrier: undefined });
  Object.assign(raw, {
    owner: {
      name: "Duffel Airways",
      iata_code: "ZZ",
      logo_symbol_url: "https://assets.duffel.com/airlines/ZZ.svg",
    },
  });
  const ownerResult = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(ownerResult?.airlineName, "Duffel Airways");
  assert.equal(ownerResult?.airlineLogo, "https://assets.duffel.com/airlines/ZZ.svg");
});

test("omits missing and non-public carrier logo URLs", () => {
  const raw = offer();
  raw.slices[0].segments[0].marketing_carrier.logo_symbol_url = "not-a-url";
  raw.slices[0].segments[0].marketing_carrier.logo_lockup_url = "";
  assert.equal(
    normalizeFlightResult("Duffel", raw, search("one-way"))?.airlineLogo,
    null,
  );
});

test("passes through live symbol logos without an airline catalogue", () => {
  for (const [name, code] of [
    ["American Airlines", "AA"],
    ["British Airways", "BA"],
    ["Lufthansa", "LH"],
    ["Air France", "AF"],
    ["Emirates", "EK"],
  ] as const) {
    const raw = offer();
    Object.assign(raw.slices[0].segments[0], {
      marketing_carrier: {
        name,
        iata_code: code,
        logo_symbol_url: `https://assets.duffel.com/airlines/${code}.svg`,
      },
    });
    const result = normalizeFlightResult("Duffel", raw, search("one-way"));
    assert.equal(result?.airlineName, name);
    assert.equal(
      result?.airlineLogo,
      `https://assets.duffel.com/airlines/${code}.svg`,
    );
  }
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
