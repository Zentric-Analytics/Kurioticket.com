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

test("homepage regional route selector returns unique valid non-overlapping routes for every source", () => {
  for (const regionCode of Object.keys(homeDiscoveryByRegion)) {
    const adventureCards = getHomeDiscoveryImageCardsByRegion(regionCode);
    const adventureRoutes = new Set(
      adventureCards.map((card) => `${card.originCode}-${card.destinationCode}`),
    );
    const cards = getHomepageRegionalRouteCards(regionCode, adventureCards);
    const routeKeys = cards.map((card) => `${card.originCode}-${card.destinationCode}`);

    assert.ok(cards.length <= HOME_REGIONAL_ROUTE_CARD_COUNT, regionCode);
    assert.equal(new Set(routeKeys).size, cards.length, regionCode);
    assert.ok(routeKeys.every((routeKey) => !adventureRoutes.has(routeKey)), regionCode);
    assert.ok(cards.every((card) => /^[A-Z]{3}$/.test(card.originCode) && /^[A-Z]{3}$/.test(card.destinationCode)), regionCode);
    assert.ok(cards.every((card) => card.originCode !== card.destinationCode), regionCode);
    assert.ok(cards.every((card) => card.image.trim().length > 0), regionCode);
    assert.ok(cards.every((card) => card.imageAlt.toLowerCase().includes(card.destinationCity.toLowerCase().split(" ")[0])), regionCode);
  }
});
