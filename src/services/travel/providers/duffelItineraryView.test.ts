import assert from "node:assert/strict";
import test from "node:test";
import fixture from "./__fixtures__/duffel-itinerary-round-trip.json";
import {
  buildDuffelItineraryKey,
  getCompatibleDuffelExactOfferIds,
  getCompatibleDuffelReturnItineraries,
  getDuffelFareBrandOptionsForOutbound,
  getDuffelOutboundItineraryOptions,
  parseDuffelItineraryView,
} from "./duffelItineraryView";

const graph = parseDuffelItineraryView(fixture);
assert.ok(graph);
const outbound = getDuffelOutboundItineraryOptions(graph)[0];
const brands = getDuffelFareBrandOptionsForOutbound(
  graph,
  outbound.itineraryKey,
);
const basic = brands.find(
  ({ fareBrandName, fareBasisCode }) =>
    fareBrandName === "Basic" && fareBasisCode === "BASIC1",
);
assert.ok(basic);

test("parses the compact itinerary hierarchy without treating offers as expanded offers", () => {
  assert.equal(graph.offerRequestId, "orq_sanitized_round_trip");
  assert.equal(graph.slices.length, 2);
  assert.equal(outbound.segments[0].flightNumber, "117");
  assert.deepEqual(
    basic.compatibleSingleTicketOffers.map(
      ({ providerOfferId }) => providerOfferId,
    ),
    ["off_1", "off_2"],
  );
});

test("resolves place, carrier, offer-owner, and aircraft references", () => {
  assert.equal(graph.slices[0].origin, "LHR");
  assert.equal(graph.slices[0].destination, "JFK");
  assert.deepEqual(outbound.segments[0], {
    origin: "LHR",
    destination: "JFK",
    departure: "2027-04-01T09:00:00Z",
    arrival: "2027-04-01T17:00:00Z",
    marketingCarrier: {
      referenceId: "arl_british_airways",
      name: "British Airways",
      iataCode: "BA",
    },
    operatingCarrier: {
      referenceId: "arl_british_airways",
      name: "British Airways",
      iataCode: "BA",
    },
    flightNumber: "117",
    aircraft: {
      referenceId: "arc_boeing_777",
      name: "Boeing 777",
      iataCode: "777",
    },
  });
  assert.deepEqual(basic.compatibleSingleTicketOffers[0].owner, {
    referenceId: "arl_british_airways",
    name: "British Airways",
    iataCode: "BA",
  });
  assert.doesNotMatch(outbound.segments[0].aircraft?.iataCode ?? "", /arc_/);
  assert.doesNotMatch(outbound.segments[0].aircraft?.name ?? "", /arc_/);
});

test("missing or malformed place and airline references fail closed", () => {
  const missingPlace = structuredClone(fixture);
  Reflect.deleteProperty(missingPlace.data.references.places, "arp_lhr_gb");
  assert.equal(parseDuffelItineraryView(missingPlace), null);

  const missingCarrier = structuredClone(fixture);
  Reflect.deleteProperty(
    missingCarrier.data.references.airlines,
    "arl_british_airways",
  );
  assert.equal(parseDuffelItineraryView(missingCarrier), null);

  const malformedAirline = structuredClone(fixture);
  malformedAirline.data.references.airlines.arl_british_airways.iata_code =
    "arl_not_an_iata_code";
  assert.equal(parseDuffelItineraryView(malformedAirline), null);
});

test("raw provider place and airline IDs are never accepted as IATA codes", () => {
  const rawPlace = structuredClone(fixture);
  rawPlace.data.slices[0].origin = "arp_unmapped_place";
  assert.equal(parseDuffelItineraryView(rawPlace), null);

  const rawAirline = structuredClone(fixture);
  rawAirline.data.slices[0].itineraries[0].segments[0].marketing_carrier =
    "arl_unmapped_airline";
  assert.equal(parseDuffelItineraryView(rawAirline), null);
});

test("nullable IATA airlines resolve for marketing, operating, and offer-owner roles", () => {
  const nonIata = structuredClone(fixture);
  const segment = nonIata.data.slices[0].itineraries[0].segments[0];
  segment.marketing_carrier = "arl_non_iata_one";
  segment.operating_carrier = "arl_non_iata_two";
  nonIata.data.slices[0].itineraries[0].brands[0].offers[0].owner =
    "arl_non_iata_one";

  const parsed = parseDuffelItineraryView(nonIata);
  assert.ok(parsed);
  const parsedSegment = parsed.slices[0].itineraries[0].segments[0];
  assert.deepEqual(parsedSegment.marketingCarrier, {
    referenceId: "arl_non_iata_one",
    name: "Example Regional",
  });
  assert.deepEqual(parsedSegment.operatingCarrier, {
    referenceId: "arl_non_iata_two",
    name: "Example Regional",
  });
  assert.deepEqual(
    parsed.slices[0].itineraries[0].brands[0].compatibleSingleTicketOffers[0]
      .owner,
    { referenceId: "arl_non_iata_one", name: "Example Regional" },
  );
  assert.doesNotMatch(parsed.slices[0].itineraries[0].itineraryKey, /arl_/);
});

test("non-IATA references remain distinct in itinerary and owner identities", () => {
  const variant = (referenceId: "arl_non_iata_one" | "arl_non_iata_two") => {
    const payload = structuredClone(fixture);
    const itinerary = payload.data.slices[0].itineraries[0];
    itinerary.segments[0].marketing_carrier = referenceId;
    itinerary.brands[0].offers[0].owner = referenceId;
    const parsed = parseDuffelItineraryView(payload);
    assert.ok(parsed);
    return parsed;
  };
  const first = variant("arl_non_iata_one");
  const second = variant("arl_non_iata_two");

  assert.notEqual(
    first.slices[0].itineraries[0].itineraryKey,
    second.slices[0].itineraries[0].itineraryKey,
  );
  assert.notEqual(
    first.slices[0].itineraries[0].brands[0].serverBrandIdentity,
    second.slices[0].itineraries[0].brands[0].serverBrandIdentity,
  );
});

test("missing and malformed explicitly referenced aircraft fail closed while absence is valid", () => {
  const missing = structuredClone(fixture);
  missing.data.slices[0].itineraries[0].segments[0].aircraft =
    "arc_not_in_references";
  assert.equal(parseDuffelItineraryView(missing), null);

  const malformed = structuredClone(fixture);
  malformed.data.references.aircraft.arc_boeing_777.iata_code = "77";
  assert.equal(parseDuffelItineraryView(malformed), null);

  const absent = structuredClone(fixture) as unknown as {
    data: {
      slices: Array<{ itineraries: Array<{ segments: UnknownSegment[] }> }>;
    };
  };
  type UnknownSegment = Record<string, unknown>;
  delete absent.data.slices[0].itineraries[0].segments[0].aircraft;
  const parsedAbsent = parseDuffelItineraryView(absent);
  assert.ok(parsedAbsent);
  assert.equal(
    parsedAbsent.slices[0].itineraries[0].segments[0].aircraft,
    undefined,
  );

  const changedEquipment = structuredClone(fixture);
  changedEquipment.data.references.aircraft.arc_airbus_350 = {
    id: "arc_airbus_350",
    iata_code: "359",
    name: "Airbus A350-900",
  };
  changedEquipment.data.slices[0].itineraries[0].segments[0].aircraft =
    "arc_airbus_350";
  const parsedChangedEquipment = parseDuffelItineraryView(changedEquipment);
  assert.ok(parsedChangedEquipment);
  assert.equal(
    parsedChangedEquipment.slices[0].itineraries[0].itineraryKey,
    outbound.itineraryKey,
  );
});

test("itinerary keys reflect physical sequence but not provider offer or price", () => {
  const key = buildDuffelItineraryKey(
    "outbound",
    "LHR",
    "JFK",
    outbound.segments,
  );
  assert.equal(key, outbound.itineraryKey);
  assert.doesNotMatch(key, /off_|600/);
  assert.notEqual(
    buildDuffelItineraryKey("outbound", "LHR", "JFK", [
      { ...outbound.segments[0], flightNumber: "999" },
    ]),
    key,
  );
});

test("itinerary identity is stable across different provider reference IDs", () => {
  const alternateReferences = structuredClone(fixture);
  const { airlines: fixtureAirlines, places: fixturePlaces } =
    alternateReferences.data.references;
  const airlines = fixtureAirlines as Record<
    string,
    (typeof fixtureAirlines)["arl_british_airways"]
  >;
  const places = fixturePlaces as Record<
    string,
    (typeof fixturePlaces)["arp_lhr_gb"]
  >;
  places.arp_london_alternate = places.arp_lhr_gb;
  places.arp_new_york_alternate = places.arp_jfk_us;
  airlines.arl_ba_alternate = airlines.arl_british_airways;
  alternateReferences.data.slices[0].origin = "arp_london_alternate";
  alternateReferences.data.slices[0].destination = "arp_new_york_alternate";
  const segment = alternateReferences.data.slices[0].itineraries[0].segments[0];
  segment.origin = "arp_london_alternate";
  segment.destination = "arp_new_york_alternate";
  segment.marketing_carrier = "arl_ba_alternate";
  segment.operating_carrier = "arl_ba_alternate";

  const alternateGraph = parseDuffelItineraryView(alternateReferences);
  assert.ok(alternateGraph);
  assert.equal(
    alternateGraph.slices[0].itineraries[0].itineraryKey,
    outbound.itineraryKey,
  );
});

test("outbound brand membership derives compatible returns and preserves every exact offer", () => {
  const returns = getCompatibleDuffelReturnItineraries(
    graph,
    outbound.itineraryKey,
    basic.serverBrandIdentity,
  );
  assert.equal(returns.length, 2);
  assert.deepEqual(
    getCompatibleDuffelExactOfferIds(
      graph,
      outbound.itineraryKey,
      basic.serverBrandIdentity,
      returns[0].itineraryKey,
    ),
    ["off_1", "off_2"],
  );
  assert.deepEqual(
    getCompatibleDuffelExactOfferIds(
      graph,
      outbound.itineraryKey,
      basic.serverBrandIdentity,
      returns[1].itineraryKey,
    ),
    ["off_2"],
  );
});

test("incomplete round-trip and split-ticket memberships fail closed", () => {
  const serialized = JSON.stringify(graph);
  assert.doesNotMatch(serialized, /off_outbound_only|off_split/);
});

test("same-named brands with different owner and material attributes remain separate", () => {
  const sameNamed = brands.filter(
    ({ fareBrandName }) => fareBrandName === "Basic",
  );
  assert.equal(sameNamed.length, 2);
  assert.notEqual(
    sameNamed[0].serverBrandIdentity,
    sameNamed[1].serverBrandIdentity,
  );
  assert.deepEqual(
    sameNamed.map(({ compatibleSingleTicketOffers }) =>
      compatibleSingleTicketOffers.map(({ owner }) => owner.iataCode),
    ),
    [["BA", "BA"], ["AA"]],
  );
});

test("mixed source currencies never produce a raw numeric minimum", () => {
  const mixed = brands.find(
    ({ fareBrandName }) => fareBrandName === "Mixed currencies",
  );
  assert.ok(mixed);
  assert.equal(mixed.indicativeFrom, undefined);
  assert.deepEqual(basic.indicativeFrom, { amount: "600.00", currency: "USD" });
});

test("malformed required hierarchy and identity fail closed", () => {
  assert.equal(parseDuffelItineraryView({ data: { slices: [] } }), null);
  const malformed = structuredClone(fixture) as unknown as {
    data: {
      slices: Array<{
        itineraries: Array<{ segments: Array<Record<string, unknown>> }>;
      }>;
    };
  };
  delete malformed.data.slices[0].itineraries[0].segments[0].departing_at;
  assert.equal(parseDuffelItineraryView(malformed), null);
});

test("nullable provider fare brands are excluded without poisoning valid brands", () => {
  const nullable = structuredClone(fixture);
  const nullBrand = structuredClone(
    nullable.data.slices[0].itineraries[0].brands[0],
  );
  nullBrand.fare_brand_name = null as unknown as string;
  nullable.data.slices[0].itineraries[0].brands.unshift(nullBrand);

  const parsed = parseDuffelItineraryView(nullable);
  assert.ok(parsed);
  const parsedBrands = parsed.slices[0].itineraries[0].brands;
  assert.ok(
    parsedBrands.some(({ fareBrandName }) => fareBrandName === "Basic"),
  );
  assert.equal(parsedBrands.length, brands.length);
  assert.equal(JSON.stringify(parsedBrands).includes("Standard"), false);
  assert.ok(
    parsedBrands.every(({ fareBrandName }) => fareBrandName.length > 0),
  );
});

test("malformed non-null fare brands fail closed and all-null brands are unusable", async () => {
  const malformed = structuredClone(fixture);
  malformed.data.slices[0].itineraries[0].brands[0].fare_brand_name =
    42 as unknown as string;
  assert.equal(parseDuffelItineraryView(malformed), null);

  const unbranded = structuredClone(fixture);
  for (const slice of unbranded.data.slices)
    for (const itinerary of slice.itineraries)
      for (const brand of itinerary.brands)
        brand.fare_brand_name = null as unknown as string;
  const parsed = parseDuffelItineraryView(unbranded);
  assert.ok(parsed);
  const { pruneDuffelItineraryGraph } = await import("./duffelItineraryView");
  assert.equal(pruneDuffelItineraryGraph(parsed, new Set()), null);
  assert.equal(JSON.stringify(parsed).includes("Standard"), false);
});

test("client-authored names and provider IDs are not accepted as selection identities", () => {
  assert.deepEqual(
    getCompatibleDuffelReturnItineraries(graph, outbound.itineraryKey, "Basic"),
    [],
  );
  assert.deepEqual(
    getCompatibleDuffelReturnItineraries(graph, outbound.itineraryKey, "off_1"),
    [],
  );
});

test("prunes graph-only and split-ticket memberships without inventing compatibility", async () => {
  const { pruneDuffelItineraryGraph, getDuffelGraphProviderOfferIds } =
    await import("./duffelItineraryView");
  const pruned = pruneDuffelItineraryGraph(graph, new Set(["off_1"]));
  assert.ok(pruned);
  assert.deepEqual([...getDuffelGraphProviderOfferIds(pruned)], ["off_1"]);
  assert.equal(JSON.stringify(pruned).includes("off_split"), false);
  assert.equal(pruneDuffelItineraryGraph(graph, new Set()), null);
});

test("Duffel relationship keys are not Kurioticket TripPlan itinerary keys", async () => {
  const { buildFlightItineraryKey } = await import("../flightOfferInventory");
  const segment = outbound.segments[0];
  const browserKey = buildFlightItineraryKey({
    direction: "outbound",
    originAirport: graph.slices[0].origin,
    destinationAirport: graph.slices[0].destination,
    departureTime: segment.departure,
    arrivalTime: segment.arrival,
    duration: "8h",
    durationMinutes: 480,
    stops: 0,
    layovers: [],
    segments: [
      {
        originAirport: segment.origin,
        destinationAirport: segment.destination,
        departureTime: segment.departure,
        arrivalTime: segment.arrival,
        airlineName: segment.marketingCarrier.name,
        flightNumber: segment.flightNumber,
      },
    ],
  });
  assert.notEqual(outbound.itineraryKey, browserKey);
  assert.match(outbound.itineraryKey, /^duffel-itinerary-v1:/);
  assert.match(browserKey, /^\["flight-itinerary-v1"/);
});
