import assert from "node:assert/strict";
import test from "node:test";
import type { MobileExploreCatalogue, MobileExploreDestination } from "../../api/exploreCatalogueContract";
import {
  allLiveExploreDestinations,
  exactLiveExploreResult,
  liveExploreDestinationById,
  liveExploreRegionBySlug,
  liveRegionDiscovery,
  searchLiveExplore,
} from "./liveExploreModels";

function destination(id: string, name: string, country: string, countryCode: string, airportCode: string): MobileExploreDestination {
  return {
    id,
    name,
    country,
    countryCode,
    primaryAirportCode: airportCode,
    airportCodes: [airportCode],
    airportNames: [`${name} International Airport`],
    searchAliases: [name],
    imageDestinationId: id,
    imageUrl: null,
    summary: `${name} summary`,
    description: `${name} description`,
    highlights: ["Culture"],
    relatedDestinationIds: [],
  };
}

const lagos = destination("ng-lagos", "Lagos", "Nigeria", "NG", "LOS");
const abuja = destination("ng-abuja", "Abuja", "Nigeria", "NG", "ABV");
const paris = destination("fr-paris", "Paris", "France", "FR", "CDG");

const catalogue: MobileExploreCatalogue = {
  version: "live-v1",
  regions: [
    { id: "europe", name: "Europe", slug: "europe", destinations: [paris] },
    { id: "africa", name: "Africa", slug: "africa", destinations: [lagos, abuja] },
  ],
};

test("live Explore view models preserve API browsing order", () => {
  assert.deepEqual(allLiveExploreDestinations(catalogue).map(({ id }) => id), ["fr-paris", "ng-lagos", "ng-abuja"]);
  assert.deepEqual(liveRegionDiscovery(catalogue).map(({ region }) => region.slug), ["europe", "africa"]);
  assert.deepEqual(liveRegionDiscovery(catalogue)[1]!.preview.map(({ id }) => id), ["ng-lagos", "ng-abuja"]);
});

test("live Explore resolves regions and destinations from the active catalogue", () => {
  assert.equal(liveExploreRegionBySlug(catalogue, "africa")?.name, "Africa");
  assert.equal(liveExploreDestinationById(catalogue).get("ng-lagos")?.primaryAirportCode, "LOS");
});

test("live Explore search preserves exact airport and country behavior", () => {
  const destinations = allLiveExploreDestinations(catalogue);
  assert.equal(exactLiveExploreResult(searchLiveExplore("LOS", destinations))?.id, "ng-lagos");
  assert.deepEqual(searchLiveExplore("Nigeria", destinations).map(({ destination }) => destination.id), ["ng-abuja", "ng-lagos"]);
});
