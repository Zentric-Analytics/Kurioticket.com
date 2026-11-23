import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { getMarketplaceHomeMerchandising } from "./homeMerchandising";
import { searchStaticHotelCatalogue } from "@/services/travel/staticHotelResults";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";
import { hotelDestinations } from "@/data/hotelDestinations";
import { buildHotelExplorationHref, buildHotelExplorationSearch } from "@/lib/hotels/hotelExplorationSearch";

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

test("every supported marketplace Home Hotel card has canonical identity, a complete direct-results request, and source-backed coverage", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  for (const market of Object.keys(popularDestinationsByMarket)) {
    for (const destination of getMarketplaceHomeMerchandising(market).hotelDestinations) {
      const context = `${market}:${destination.id}:${destination.city}, ${destination.country}`;
      assert.ok(destination.canonicalDestinationId, `${context}:canonical id`);
      assert.ok(destination.destinationSearchValue, `${context}:search value`);
      const canonical = hotelDestinations.find(({ id }) => id === destination.canonicalDestinationId);
      assert.ok(canonical, `${context}:canonical destination resolves`);
      assert.equal(destination.destinationSearchValue, canonical.searchValue, `${context}:canonical search value`);
      const search = buildHotelExplorationSearch({
        destination: destination.destinationSearchValue,
        destinationId: destination.canonicalDestinationId,
        source: "home-popular-stays",
        now,
      });
      assert.deepEqual(search, {
        destination: destination.destinationSearchValue,
        destinationId: destination.canonicalDestinationId,
        checkIn: "2030-01-29",
        checkOut: "2030-02-05",
        guests: "2",
        rooms: "1",
        sort: "cheapest",
        intentSource: "home-popular-stays",
      });
      const webHref = buildHotelExplorationHref({
        destination: destination.destinationSearchValue,
        destinationId: destination.canonicalDestinationId,
        source: "home-popular-stays",
        now,
      });
      assert.ok(webHref?.startsWith("/hotels/results?"), `${context}:web results`);
      assert.doesNotMatch(webHref ?? "", /^\/hotels(?:\?|$)/, `${context}:no form fallback`);
      const results = searchStaticHotelCatalogue(
        destination.destinationSearchValue,
        destination.canonicalDestinationId,
      );
      assert.ok(results.length > 0, `${context}:results`);
      assert.ok(results.every((hotel) => hotel.destinationId === destination.canonicalDestinationId), `${context}:destination match`);
      assert.ok(results.every((hotel) => hotel.inventoryKind !== "discovery" || Boolean(hotel.officialSourceUrl && hotel.locationSourceUrl)), `${context}:source-backed`);
      assert.ok(results.every((hotel) => hotel.inventoryKind !== "discovery" || hotel.indicativeNightlyPrice === undefined), `${context}:unpriced discovery inventory`);
    }
  }
});

test("Web Home promoted Hotel navigation has no manual-form fallback", () => {
  const pageSource = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
  const helperSource = pageSource.slice(
    pageSource.indexOf("function buildDestinationCardHref"),
    pageSource.indexOf("function getRouteKey"),
  );
  assert.match(helperSource, /buildHotelExplorationHref/);
  assert.doesNotMatch(helperSource, /buildHotelDiscoveryResultsHref|["']\/hotels["']/);
});
