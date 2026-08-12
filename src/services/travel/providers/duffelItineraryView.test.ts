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
