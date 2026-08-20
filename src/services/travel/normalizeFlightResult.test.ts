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

test("preserves complete customer-facing Duffel facts without provider identities", () => {
  const raw = offer();
  Object.assign(raw, {
    base_amount: "600.00",
    base_currency: "EUR",
    tax_amount: "100.25",
    tax_currency: "EUR",
    total_emissions_kg: "460",
    updated_at: "2026-12-01T12:00:00Z",
    passenger_identity_documents_required: true,
    supported_passenger_identity_document_types: ["passport"],
    supported_loyalty_programmes: ["EX"],
    available_services: [{ id: "ase_private", type: "baggage", total_amount: "50.00", total_currency: "EUR", maximum_quantity: 2, passenger_ids: ["pas_private"], segment_ids: ["LHR-JFK"] }],
  });
  const segment = raw.slices[0].segments[0];
  Object.assign(segment, {
    origin: { iata_code: "LHR", name: "Heathrow Airport", city_name: "London", time_zone: "Europe/London" },
    destination: { iata_code: "JFK", name: "John F. Kennedy International Airport", city_name: "New York", time_zone: "America/New_York" },
    origin_terminal: "5",
    destination_terminal: "8",
    operating_carrier: { name: "Operator Air", iata_code: "OP" },
    operating_carrier_flight_number: "9001",
    aircraft: { name: "Airbus A330-300", iata_code: "333" },
    stops: [{ duration: "PT45M", arriving_at: "2027-01-01T11:00:00Z", departing_at: "2027-01-01T11:45:00Z", airport: { iata_code: "KEF", name: "Keflavik Airport", city_name: "Reykjavik", time_zone: "Atlantic/Reykjavik" } }],
    passengers: [{
      cabin_class: "economy",
      cabin_class_marketing_name: "Economy Comfort",
      fare_brand_name: "Standard",
      fare_basis_code: "OXZ0RO",
      baggages: [{ type: "checked", quantity: 1 }],
      cabin: {
        marketing_name: "Economy Comfort",
        amenities: {
          wifi: { available: "true", cost: "free" },
          power: { available: "true" },
          seat: { type: "standard", pitch: "32", legroom: "standard" },
        },
      },
    }],
  });
  Object.assign(raw.slices[0], { conditions: { priority_check_in: true, priority_boarding: false, advance_seat_selection: null } });

  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.ok(result);
  const normalizedSegment = result.legs?.[0]?.segments[0];
  assert.equal(normalizedSegment?.originDetails?.name, "Heathrow Airport");
  assert.equal(normalizedSegment?.destinationDetails?.terminal, "8");
  assert.equal(normalizedSegment?.marketingCarrier?.name, "Example Air");
  assert.equal(normalizedSegment?.operatingCarrier?.name, "Operator Air");
  assert.equal(normalizedSegment?.aircraft?.name, "Airbus A330-300");
  assert.equal(normalizedSegment?.technicalStops?.[0]?.airport.iataCode, "KEF");
  assert.equal(normalizedSegment?.cabinDetails?.[0]?.fareBasisCode, "OXZ0RO");
  assert.equal(normalizedSegment?.cabinDetails?.[0]?.amenities?.wifi?.cost, "free");
  assert.equal(result.providerDetails?.price?.baseAmount, 600);
  assert.equal(result.providerDetails?.price?.taxAmount, 100.25);
  assert.equal(result.providerDetails?.totalEmissionsKg, 460);
  assert.equal(result.providerDetails?.optionalServices?.[0]?.description, "Additional baggage available");
  assert.match(JSON.stringify(result), /Additional baggage available/);
  assert.doesNotMatch(JSON.stringify(result), /ase_private|pas_private/);
});

test("does not use a static airline-name fallback", () => {
  const raw = offer();
  Object.assign(raw.slices[0].segments[0], { marketing_carrier: { iata_code: "BA" } });
  assert.equal(normalizeFlightResult("Duffel", raw, search("one-way")), null);
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

test("preserves slice fare brands and only summarizes a uniform trip brand", () => {
  const uniform = offer();
  Object.assign(uniform.slices[0], { fare_brand_name: "Basic" });
  const oneWay = normalizeFlightResult("Duffel", uniform, search("one-way"));
  assert.equal(oneWay?.legs?.[0].fareBrandName, "Basic");
  assert.equal(oneWay?.fareBrandName, "Basic");

  const mixed = offer();
  Object.assign(mixed.slices[0], { fare_brand_name: "Basic" });
  const returnSlice = slice("JFK", "LHR", "2027-01-08T10:00:00Z", "2027-01-08T18:00:00Z");
  Object.assign(returnSlice, { fare_brand_name: "Standard" });
  mixed.slices.push(returnSlice);
  const roundTrip = normalizeFlightResult("Duffel", mixed, search("round-trip"));
  assert.deepEqual(roundTrip?.legs?.map(({ fareBrandName }) => fareBrandName), ["Basic", "Standard"]);
  assert.equal(roundTrip?.fareBrandName, undefined);
});

test("inspects baggage across legs and passengers without treating missing data as included", () => {
  const raw = offer();
  raw.slices[0].segments[0].passengers.push({ cabin_class: "economy", baggages: [] });
  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.ok(result?.fareTerms?.some((term) => term.category === "baggage" && term.semantic === "positive"));
  assert.ok(result?.fareTerms?.every((term) => !/paid|optional/i.test(term.text)));

  raw.slices[0].segments[0].passengers = [{ cabin_class: "economy", baggages: [] }];
  const unknown = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(unknown?.fareTerms?.find((term) => term.category === "baggage")?.semantic, "informational");
});

test("retains positive, negative, and unknown condition semantics", () => {
  const result = normalizeFlightResult("Duffel", offer(), search("one-way"));
  assert.equal(result?.fareTerms?.find((term) => term.category === "refund")?.semantic, "positive");
  assert.equal(result?.fareTerms?.find((term) => term.category === "change")?.semantic, "negative");
  const raw = offer();
  raw.conditions = undefined as unknown as typeof raw.conditions;
  assert.equal(normalizeFlightResult("Duffel", raw, search("one-way"))?.fareTerms?.find((term) => term.category === "refund")?.semantic, "informational");
});

test("retains slice-level conditions and ignores paid optional baggage services", () => {
  const raw = offer() as ReturnType<typeof offer> & { available_services?: unknown[] };
  raw.conditions = undefined as unknown as typeof raw.conditions;
  Object.assign(raw.slices[0], {
    conditions: {
      refund_before_departure: { allowed: false },
      change_before_departure: { allowed: true },
    },
  });
  raw.slices[0].segments[0].passengers[0].baggages = [];
  raw.available_services = [{ type: "baggage", total_amount: "25.00" }];
  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(result?.fareTerms?.find((term) => term.category === "refund")?.semantic, "negative");
  assert.equal(result?.fareTerms?.find((term) => term.category === "change")?.semantic, "positive");
  assert.doesNotMatch(result?.baggageInfo || "", /included/i);
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

test("rejects provider slices whose direction contradicts the searched route", () => {
  const raw = offer();
  raw.slices[0] = slice("JFK", "LHR", "2027-01-01T08:00:00Z", "2027-01-01T16:00:00Z");
  assert.equal(normalizeFlightResult("Duffel", raw, search("one-way")), null);
});

test("rejects missing currency and non-positive or malformed prices", () => {
  assert.equal(
    normalizeFlightResult("Duffel", { ...offer(), total_currency: undefined }, search("one-way")),
    null,
  );
  for (const total_amount of ["0", "-1", "not-a-price"]) {
    assert.equal(
      normalizeFlightResult("Duffel", { ...offer(), total_amount }, search("one-way")),
      null,
    );
  }
});

test("does not turn the searched cabin into a provider-confirmed cabin", () => {
  const raw = offer();
  raw.slices[0].segments[0].passengers[0].cabin_class = undefined as unknown as string;
  assert.equal(normalizeFlightResult("Duffel", raw, search("one-way"))?.cabinClass, "");
});

test("missing baggage and conditions remain explicitly unknown", () => {
  const raw = offer();
  raw.conditions = undefined as unknown as typeof raw.conditions;
  raw.slices[0].segments[0].passengers[0].baggages = [];
  const result = normalizeFlightResult("Duffel", raw, search("one-way"));
  assert.equal(result?.baggageInfo, "Baggage details not supplied by the provider");
  assert.equal(result?.refundInfo, "Change and refund rules not supplied by the provider");
});

test("rejects malformed timestamps, disconnected segments, and unidentified carriers", () => {
  const malformedTime = offer();
  malformedTime.slices[0].segments[0].departing_at = "not-a-time";
  assert.equal(normalizeFlightResult("Duffel", malformedTime, search("one-way")), null);

  const disconnected = offer();
  disconnected.slices[0].segments.push({
    ...slice("DFW", "JFK", "2027-01-01T12:00:00Z", "2027-01-01T16:00:00Z").segments[0],
  });
  assert.equal(normalizeFlightResult("Duffel", disconnected, search("one-way")), null);

  const unidentified = offer();
  delete (unidentified.slices[0].segments[0] as { marketing_carrier?: unknown })
    .marketing_carrier;
  assert.equal(normalizeFlightResult("Duffel", unidentified, search("one-way")), null);
});
