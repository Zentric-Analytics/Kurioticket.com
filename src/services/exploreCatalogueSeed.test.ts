import assert from "node:assert/strict";
import test from "node:test";
import { exploreDestinations } from "@/shared/destinations/exploreDestinationContent";
import {
  EXPLORE_REGIONS,
  exploreRegionForDestination,
  exploreRegionSlug,
} from "@/shared/destinations/exploreDestinationRegions";
import { buildExploreCatalogueSeed } from "./exploreCatalogueSeed";

const EXPECTED_REGION_COUNTS = [54, 64, 52, 16, 6, 10, 15, 18] as const;

test("Explore live catalogue seed preserves the complete bundled catalogue", () => {
  const seed = buildExploreCatalogueSeed();

  assert.equal(seed.regions.length, EXPLORE_REGIONS.length);
  assert.equal(seed.destinations.length, exploreDestinations.length);
  assert.equal(seed.destinations.length, 235);
  assert.equal(new Set(seed.destinations.map(({ id }) => id)).size, 235);
  assert.deepEqual(
    new Set(seed.destinations.map(({ id }) => id)),
    new Set(exploreDestinations.map(({ id }) => id)),
  );
});

test("Explore live catalogue seed preserves region taxonomy and ordering", () => {
  const seed = buildExploreCatalogueSeed();

  assert.deepEqual(
    seed.regions.map(({ name }) => name),
    [...EXPLORE_REGIONS],
  );
  assert.deepEqual(
    seed.regions.map(({ slug }) => slug),
    EXPLORE_REGIONS.map(exploreRegionSlug),
  );
  assert.deepEqual(
    seed.regions.map((region) => seed.destinations.filter((destination) => destination.regionId === region.id).length),
    EXPECTED_REGION_COUNTS,
  );

  for (const destination of exploreDestinations) {
    const seeded = seed.destinations.find(({ id }) => id === destination.id);
    assert.ok(seeded, destination.id);
    assert.equal(seeded.regionId, exploreRegionSlug(exploreRegionForDestination(destination)));
  }
});

test("Explore live catalogue seed carries search, editorial and publish-safe defaults", () => {
  const seed = buildExploreCatalogueSeed();

  for (const destination of seed.destinations) {
    assert.ok(destination.airportCodes.length > 0, destination.id);
    assert.ok(destination.airportNames.length > 0, destination.id);
    assert.equal(destination.published, true);
    assert.equal(destination.imageUrl, null);
    assert.ok(destination.summary?.trim(), destination.id);
    assert.ok(destination.description?.trim(), destination.id);
    assert.ok(destination.highlights.length >= 3, destination.id);
  }
});
