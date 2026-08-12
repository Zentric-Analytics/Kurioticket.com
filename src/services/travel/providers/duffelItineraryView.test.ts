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

test("resolves place, carrier, and offer-owner references to IATA codes", () => {
  assert.equal(graph.slices[0].origin, "LHR");
  assert.equal(graph.slices[0].destination, "JFK");
  assert.deepEqual(outbound.segments[0], {
    origin: "LHR",
    destination: "JFK",
    departure: "2027-04-01T09:00:00Z",
    arrival: "2027-04-01T17:00:00Z",
    marketingCarrier: "BA",
    operatingCarrier: "BA",
    flightNumber: "117",
  });
  assert.equal(basic.compatibleSingleTicketOffers[0].owner, "BA");
  assert.doesNotMatch(JSON.stringify(graph), /arp_|arl_/);
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
      compatibleSingleTicketOffers.map(({ owner }) => owner),
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
