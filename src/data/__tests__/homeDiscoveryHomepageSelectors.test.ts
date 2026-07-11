import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_DISCOVERY_IMAGE_CARD_COUNT,
  HOME_DISCOVERY_IMAGE_CARD_EXCLUSIONS,
  HOME_REGIONAL_ROUTE_CARD_COUNT,
  getHomeDiscoveryImageCardsByRegion,
  getHomepageRegionalRouteCards,
  homeDiscoveryByRegion,
} from "@/data/homeDiscovery";

test("homepage image-card selector removes exactly four cards per regional source", () => {
  for (const regionCode of Object.keys(homeDiscoveryByRegion)) {
    const exclusions = HOME_DISCOVERY_IMAGE_CARD_EXCLUSIONS[regionCode];
    if (!exclusions) continue;

    const cards = getHomeDiscoveryImageCardsByRegion(regionCode);
    assert.equal(exclusions.length, 4, regionCode);
    assert.equal(cards.length, HOME_DISCOVERY_IMAGE_CARD_COUNT, regionCode);
    assert.ok(cards.every((card) => !exclusions.includes(card.id)), regionCode);
  }
});

test("homepage regional route selector returns ten unique valid routes", () => {
  const cards = getHomepageRegionalRouteCards("US");
  assert.equal(cards.length, HOME_REGIONAL_ROUTE_CARD_COUNT);
  assert.equal(new Set(cards.map((card) => `${card.originCode}-${card.destinationCode}`)).size, HOME_REGIONAL_ROUTE_CARD_COUNT);
  assert.ok(cards.every((card) => /^[A-Z]{3}$/.test(card.originCode) && /^[A-Z]{3}$/.test(card.destinationCode)));
  assert.ok(cards.every((card) => card.originCode !== card.destinationCode));
});
