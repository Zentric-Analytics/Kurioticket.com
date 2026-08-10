import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { destinations } from "./destinationCatalogue";
import {
  destinationsForExploreRegion,
  EXPLORE_REGION_NAMES,
  EXPLORE_REGION_SECTIONS,
  searchExplore,
  searchExploreRegion,
} from "./exploreModels";
import {
  exploreRegionForDestination,
  groupExploreDestinationsByRegion,
} from "../../../../../src/shared/destinations/exploreDestinationRegions";
import { exploreRegionRoute } from "./exploreInteractionModels";

const expectedCounts = {
  Africa: 54,
  Asia: 64,
  Europe: 52,
  "North America": 16,
  "Central America": 6,
  Caribbean: 10,
  "South America": 15,
  "Oceania & Pacific": 18,
} as const;

test("canonical destinations have one complete deterministic region taxonomy", () => {
  assert.equal(destinations.length, 235);
  assert.deepEqual(EXPLORE_REGION_NAMES, Object.keys(expectedCounts));
  const grouped = groupExploreDestinationsByRegion(destinations);
  const assignedIds = EXPLORE_REGION_NAMES.flatMap((region) =>
    grouped.get(region)!.map((destination) => destination.id),
  );
  assert.equal(assignedIds.length, 235);
  assert.equal(new Set(assignedIds).size, 235);
  assert.deepEqual(new Set(assignedIds), new Set(destinations.map(({ id }) => id)));
  for (const destination of destinations) {
    assert.ok(EXPLORE_REGION_NAMES.includes(exploreRegionForDestination(destination)));
  }
  assert.deepEqual(
    Object.fromEntries(EXPLORE_REGION_NAMES.map((region) => [region, grouped.get(region)!.length])),
    expectedCounts,
  );
});

test("region discovery previews are bounded, regional and catalogue-deterministic", () => {
  assert.equal(EXPLORE_REGION_SECTIONS.length, 8);
  assert.deepEqual(EXPLORE_REGION_SECTIONS.map(({ name }) => name), EXPLORE_REGION_NAMES);
  for (const section of EXPLORE_REGION_SECTIONS) {
    assert.equal(section.destinations.length, expectedCounts[section.name]);
    assert.equal(section.previewDestinations.length, 3);
    assert.deepEqual(section.previewDestinations, section.destinations.slice(0, 3));
    assert.ok(section.previewDestinations.every(
      (destination) => exploreRegionForDestination(destination) === section.name,
    ));
  }
});

test("regional search reuses global ranking while remaining region-scoped", () => {
  const africa = destinationsForExploreRegion("Africa");
  assert.equal(searchExploreRegion("Africa", "").length, 54);
  assert.ok(searchExploreRegion("Africa", "South Africa").every(
    ({ destination }) => destination.country === "South Africa",
  ));
  assert.equal(searchExploreRegion("Africa", "CPT")[0]?.destination.id, "za-cape-town");
  assert.deepEqual(searchExploreRegion("Africa", "CPT"), searchExplore("CPT"));
  assert.deepEqual(searchExploreRegion("Africa", "São"), []);
  assert.ok(searchExploreRegion("Africa", "Cairo").every(
    ({ destination }) => africa.includes(destination),
  ));
});

test("Explore presentation defaults to regions and wires accessible See all navigation", () => {
  const mainSource = readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");
  const regionSource = readFileSync("src/features/explore/ExploreRegionScreen.tsx", "utf8");
  assert.match(mainSource, /Explore by region/);
  assert.match(mainSource, /EXPLORE_REGION_SECTIONS/);
  assert.match(mainSource, /action="See all"/);
  assert.match(mainSource, /See all destinations in/);
  assert.doesNotMatch(mainSource, /POPULAR_DESTINATIONS|Popular destinations/);
  assert.match(regionSource, /searchExploreRegion/);
  assert.match(regionSource, /No destinations found in/);
  assert.deepEqual(exploreRegionRoute("Africa"), {
    pathname: "/explore/region/[region]",
    params: { region: "Africa" },
  });
});
