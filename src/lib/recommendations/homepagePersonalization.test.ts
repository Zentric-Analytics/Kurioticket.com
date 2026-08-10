import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomepageRecommendationOrder,
  getSavedItemHomepageDestinationCodes,
  reorderHomepageCardsBySavedItemDestinations,
} from "@/lib/recommendations/homepagePersonalization";

const cards = [
  { id: "nyc", code: "NYC" },
  { id: "lis", code: "LIS" },
  { id: "tokyo", code: "NRT" },
  { id: "paris", code: "CDG" },
];

test("preference ON style ordering promotes saved trip destination matches", () => {
  const actual = reorderHomepageCardsBySavedItemDestinations(
    cards,
    ["NRT"],
    (card) => card.code,
  );

  assert.deepEqual(actual.map((card) => card.id), ["tokyo", "nyc", "lis", "paris"]);
});

test("preference OFF and signed-out users pass no signals and keep generic order", () => {
  const actual = reorderHomepageCardsBySavedItemDestinations(
    cards,
    [],
    (card) => card.code,
  );

  assert.deepEqual(actual, cards);
});

test("no Saved items and generic fallback keep homepage order unchanged", () => {
  const signals = getSavedItemHomepageDestinationCodes([]);
  const actual = reorderHomepageCardsBySavedItemDestinations(cards, signals, (card) => card.code);

  assert.deepEqual(actual.map((card) => card.id), cards.map((card) => card.id));
});

test("malformed Saved items are ignored", () => {
  const signals = getSavedItemHomepageDestinationCodes([
    { destination: "" },
    { destination: "New York" },
    { destination: null, linkedSearchDestination: "?" },
  ]);

  assert.deepEqual(signals, []);
});

test("Saved Trip destinations outrank linked Saved Search destinations", () => {
  const signals = getSavedItemHomepageDestinationCodes([
    { destination: "CDG", linkedSearchDestination: "LIS" },
    { destination: null, linkedSearchDestination: "NRT" },
  ]);
  const actual = reorderHomepageCardsBySavedItemDestinations(cards, signals, (card) => card.code);

  assert.deepEqual(signals, ["CDG", "LIS", "NRT"]);
  assert.deepEqual(actual.map((card) => card.id), ["paris", "lis", "tokyo", "nyc"]);
});

test("duplicate destinations are deduplicated and homepage cards are not duplicated", () => {
  const signals = getSavedItemHomepageDestinationCodes([
    { destination: "lis" },
    { destination: "LIS", linkedSearchDestination: "NRT" },
    { destination: null, linkedSearchDestination: "NRT" },
  ]);
  const actual = reorderHomepageCardsBySavedItemDestinations(cards, signals, (card) => card.code);

  assert.deepEqual(signals, ["LIS", "NRT"]);
  assert.deepEqual(actual.map((card) => card.id), ["lis", "tokyo", "nyc", "paris"]);
  assert.equal(new Set(actual.map((card) => card.id)).size, actual.length);
});

test("deterministic stable ordering preserves relative order inside priority groups", () => {
  const duplicateDestinationCards = [
    { id: "lis-a", code: "LIS" },
    { id: "nyc", code: "NYC" },
    { id: "lis-b", code: "LIS" },
    { id: "tokyo", code: "NRT" },
  ];

  const first = reorderHomepageCardsBySavedItemDestinations(
    duplicateDestinationCards,
    ["LIS"],
    (card) => card.code,
  );
  const second = reorderHomepageCardsBySavedItemDestinations(
    duplicateDestinationCards,
    ["LIS"],
    (card) => card.code,
  );

  assert.deepEqual(first.map((card) => card.id), ["lis-a", "lis-b", "nyc", "tokyo"]);
  assert.deepEqual(second, first);
});


test("homepage behavior returns reordered public card ids without duplicating cards", () => {
  const order = buildHomepageRecommendationOrder(
    {
      popular: [
        { id: "popular-nyc", destinationCode: "NYC" },
        { id: "popular-lis", destinationCode: "LIS" },
        { id: "popular-cdg", destinationCode: "CDG" },
      ],
      discovery: [
        { id: "discovery-nrt", destinationCode: "NRT" },
        { id: "discovery-lis", destinationCode: "LIS" },
      ],
    },
    ["LIS"],
  );

  assert.deepEqual(order, {
    popular: ["popular-lis", "popular-nyc", "popular-cdg"],
    discovery: ["discovery-lis", "discovery-nrt"],
  });
});

test("homepage behavior returns empty order for generic fallback", () => {
  assert.deepEqual(
    buildHomepageRecommendationOrder(
      { popular: [{ id: "popular-nyc", destinationCode: "NYC" }] },
      [],
    ),
    {},
  );
});
