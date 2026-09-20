import assert from "node:assert/strict";
import test from "node:test";
import {
  ExploreCatalogueUnavailableError,
  resolveExploreDestinationMapCoordinates,
} from "./exploreCatalogueService";

test("live Explore coordinates support destinations newer than the bundled airport catalogue", () => {
  assert.deepEqual(
    resolveExploreDestinationMapCoordinates({
      id: "zz-new-city",
      primaryAirportCode: "ZZZ",
      sourceProvenance: {
        coordinates: { latitude: 12.345, longitude: 67.89 },
      },
    }),
    { latitude: 12.345, longitude: 67.89 },
  );
});

test("legacy Explore rows can still resolve coordinates from the server airport catalogue", () => {
  const coordinates = resolveExploreDestinationMapCoordinates({
    id: "ng-lagos",
    primaryAirportCode: "LOS",
    sourceProvenance: {},
  });
  assert.ok(Number.isFinite(coordinates.latitude));
  assert.ok(Number.isFinite(coordinates.longitude));
});

test("published Explore destinations without any trusted coordinates fail closed", () => {
  assert.throws(
    () => resolveExploreDestinationMapCoordinates({
      id: "zz-missing",
      primaryAirportCode: "ZZZ",
      sourceProvenance: {},
    }),
    ExploreCatalogueUnavailableError,
  );
});
