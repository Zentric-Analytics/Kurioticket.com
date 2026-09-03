import assert from "node:assert/strict";
import test from "node:test";

import { getMarketplaceHomeMerchandising } from "./homeMerchandising";

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
