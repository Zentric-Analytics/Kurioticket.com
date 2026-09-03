import assert from "node:assert/strict";
import test from "node:test";

import { getMarketplaceHomeMerchandising } from "./homeMerchandising";
import { searchStaticHotelCatalogue } from "@/services/travel/staticHotelResults";

test("Home merchandising resolves deterministically for representative markets", () => {
  for (const market of ["NG", "US", "GB", "DE"]) {
    const first = getMarketplaceHomeMerchandising(market);
    const second = getMarketplaceHomeMerchandising(market);
    assert.deepEqual(first, second);
    assert.ok(first.hotelDestinations.length > 0, `${market} Hotel destinations`);
    assert.ok(first.adventureRoutes.length > 0, `${market} adventure routes`);
  }
});

test("Hotel merchandising uses stable destination identities rather than native copies", () => {
  const items = getMarketplaceHomeMerchandising("NG").hotelDestinations;
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.ok(items.every((item) => item.city && item.country && item.image));
});

test("every promoted Hotel destination has deterministic source-backed coverage", () => {
  for (const market of ["NG", "US", "GB", "DE"]) {
    for (const destination of getMarketplaceHomeMerchandising(market).hotelDestinations) {
      const results = searchStaticHotelCatalogue(`${destination.city}, ${destination.country}`);
      assert.ok(results.length > 0, `${market}:${destination.id}`);
      assert.ok(results.every((hotel) => hotel.inventoryKind !== "discovery" || Boolean(hotel.officialSourceUrl && hotel.locationSourceUrl)), `${market}:${destination.id}`);
    }
  }
});
