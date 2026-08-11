import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  destinations,
  EXPLORE_REGIONS,
  exploreRegionForDestination,
} from "./destinationCatalogue";
import {
  DESTINATIONS_BY_REGION,
  formatDestinationCount,
  groupExploreDestinationsByCountry,
  searchExplore,
  searchExploreRegion,
} from "./exploreModels";

const screenSource = () =>
  readFileSync("src/features/explore/ExploreRegionScreen.tsx", "utf8");

test("country groups provide complete, unique canonical regional coverage", () => {
  const groupedIds: string[] = [];
  const countryCodes = new Set<string>();
  const expectedTotals = [54, 64, 52, 16, 6, 10, 15, 18];

  EXPLORE_REGIONS.forEach((region, index) => {
    const regional = DESTINATIONS_BY_REGION.get(region)!;
    const groups = groupExploreDestinationsByCountry(regional);
    assert.equal(regional.length, expectedTotals[index]);
    assert.ok(groups.every((group) => group.destinations.length > 0));
    assert.deepEqual(
      groups.map(({ country }) => country),
      groups.map(({ country }) => country).sort((a, b) => a.localeCompare(b)),
    );

    const regionIds = groups.flatMap((group) => {
      countryCodes.add(group.countryCode);
      assert.deepEqual(
        group.destinations.map(({ name }) => name),
        group.destinations
          .map(({ name }) => name)
          .sort((a, b) => a.localeCompare(b)),
      );
      for (const destination of group.destinations) {
        assert.equal(destination.country, group.country);
        assert.equal(destination.countryCode, group.countryCode);
        assert.equal(exploreRegionForDestination(destination), region);
      }
      return group.destinations.map(({ id }) => id);
    });
    assert.equal(regionIds.length, regional.length);
    assert.equal(new Set(regionIds).size, regional.length);
    assert.deepEqual(new Set(regionIds), new Set(regional.map(({ id }) => id)));
    groupedIds.push(...regionIds);
  });

  assert.equal(groupedIds.length, 235);
  assert.equal(new Set(groupedIds).size, 235);
  assert.deepEqual(
    new Set(groupedIds),
    new Set(destinations.map(({ id }) => id)),
  );
  assert.equal(countryCodes.size, 162);
});

test("country groups retain canonical labels, derived counts, and representative members", () => {
  const allGroups = EXPLORE_REGIONS.flatMap((region) =>
    groupExploreDestinationsByCountry(DESTINATIONS_BY_REGION.get(region)!),
  );
  const country = (name: string) =>
    allGroups.find((group) => group.country === name)!;

  for (const label of [
    "Hong Kong SAR China",
    "Macao SAR China",
    "French Polynesia",
    "Cook Islands",
    "Guam",
    "Northern Mariana Islands",
    "Antigua & Barbuda",
    "Trinidad & Tobago",
  ])
    assert.equal(country(label).country, label);

  assert.deepEqual(
    country("Nigeria").destinations.map(({ name }) => name),
    ["Abuja", "Enugu", "Kano", "Lagos", "Port Harcourt"],
  );
  assert.deepEqual(
    country("Brazil").destinations.map(({ name }) => name),
    ["Brasília", "Manaus", "Rio de Janeiro", "São Paulo"],
  );
  assert.deepEqual(
    country("Australia").destinations.map(({ name }) => name),
    ["Adelaide", "Brisbane", "Melbourne", "Perth", "Sydney"],
  );
  assert.equal(
    formatDestinationCount(country("Ghana").destinations.length),
    "1 destination",
  );
  assert.equal(
    formatDestinationCount(country("Nigeria").destinations.length),
    "5 destinations",
  );
});

test("region screen groups empty browsing and keeps active search flat", () => {
  const source = screenSource();
  assert.match(
    source,
    /searchActive \? \(\s*<FlatList[\s\S]*?renderItem={[\s\S]*?<DestinationResultRow[\s\S]*?\/>\s*\)}\s*\/>\s*\) : \(/,
  );
  assert.match(
    source,
    /<SectionList\s+sections={countrySections}[\s\S]*?renderItem={[\s\S]*?<RegionBrowseDestinationCard/,
  );
  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /destinationDetailsRoute\(destination\.id\)/);
});

test("empty regional browsing uses responsive Popular-style destination cards", () => {
  const source = screenSource();
  const aspectRatio = Number(
    source.match(/REGION_BROWSE_IMAGE_ASPECT_RATIO = ([\d.]+);/)?.[1],
  );
  const imageHeightRatio = Number(
    source.match(/REGION_BROWSE_IMAGE_HEIGHT_RATIO = ([\d.]+);/)?.[1],
  );

  assert.ok(aspectRatio > 1 && aspectRatio < 2);
  assert.ok(imageHeightRatio >= 0.58 && imageHeightRatio <= 0.62);
  assert.ok(Math.abs(1 - imageHeightRatio - 0.4) < Number.EPSILON);
  assert.match(
    source,
    /screenWidth - REGION_BROWSE_HORIZONTAL_INSET \* 2/,
  );
  assert.match(source, /const imageHeight = width \/ REGION_BROWSE_IMAGE_ASPECT_RATIO/);
  assert.match(source, /const height = imageHeight \/ REGION_BROWSE_IMAGE_HEIGHT_RATIO/);
  assert.match(source, /informationHeight: height - imageHeight/);
  for (const screenWidth of [320, 360, 390, 430]) {
    const width = Math.max(240, screenWidth - 36);
    const imageHeight = width / aspectRatio;
    const height = imageHeight / imageHeightRatio;
    assert.equal(imageHeight / height, 0.6);
    assert.ok(Math.abs((height - imageHeight) / height - 0.4) < 1e-10);
    assert.equal(width, screenWidth - 36);
  }
  assert.match(source, /browseCard:[\s\S]*?borderRadius: 16/);
  assert.match(source, /browseImage: {[\s\S]*?width: "100%"/);
  assert.match(
    source,
    /style=\{\[s\.browseImage, \{ height: layout\.imageHeight \}\]\}/,
  );
  assert.match(
    source,
    /<Image[\s\S]*?source={[\s\S]*?media\?\.source[\s\S]*?resizeMode="cover"/,
  );
  assert.match(
    source,
    /<AndroidFavoriteButton[\s\S]*?style={s\.browseHeart}/,
  );
  assert.match(
    source,
    /browseHeart: { position: "absolute", right: 10, top: 10 }/,
  );
});

test("browse cards render canonical editorial and metadata in the Popular hierarchy", () => {
  const source = screenSource();
  const browseCard = source.slice(
    source.indexOf("function RegionBrowseDestinationCard"),
    source.indexOf("export function ExploreRegionScreen"),
  );

  assert.match(
    browseCard,
    /<Text style=\{s\.browseName\}>\{destination\.name\}<\/Text>\s*<Text style=\{s\.browseCountry\}> · \{destination\.country\}<\/Text>/,
  );
  assert.match(browseCard, /numberOfLines=\{3\}/);
  assert.match(browseCard, /ellipsizeMode="tail"[\s\S]*?\{destination\.summary\}/);
  assert.doesNotMatch(browseCard, /destination\.(description|highlights)/);
  assert.match(browseCard, /destination\.primaryAirportCode/);
  assert.match(browseCard, /formatFlightAccess\([\s\S]*?destination\.airportCodes/);
  assert.match(browseCard, /destinationMedia\(destination\.id\)/);
  assert.match(browseCard, /media\?\.source/);
  assert.match(browseCard, /style=\{s\.browseHeart\}/);
  assert.match(browseCard, /onPress=\{onToggle\}/);
  assert.ok(
    browseCard.indexOf("style={[s.browseImage") <
      browseCard.indexOf("style={[s.browseCopy"),
  );
});

test("active regional search stays compact and excludes browse-card editorial", () => {
  const source = screenSource();
  const activeSearch = source.slice(
    source.indexOf("{searchActive ? ("),
    source.indexOf(") : (", source.indexOf("{searchActive ? (")),
  );

  assert.match(activeSearch, /<FlatList/);
  assert.match(activeSearch, /<DestinationResultRow/);
  assert.doesNotMatch(activeSearch, /RegionBrowseDestinationCard/);
  assert.doesNotMatch(activeSearch, /destination\.summary/);
});

test("regional search continues to reuse unchanged global ranking and scope", () => {
  assert.deepEqual(
    searchExploreRegion("Nigeria", "Africa").map(
      ({ destination }) => destination.id,
    ),
    DESTINATIONS_BY_REGION.get("Africa")!
      .filter(({ country }) => country === "Nigeria")
      .map(({ id }) => id),
  );
  assert.equal(
    searchExploreRegion("LOS", "Africa")[0]?.destination.id,
    "ng-lagos",
  );
  assert.deepEqual(searchExploreRegion("LOS", "Europe"), []);
  assert.deepEqual(
    searchExploreRegion("São", "South America"),
    searchExploreRegion("sao", "South America"),
  );
  assert.deepEqual(
    searchExploreRegion("sao", "South America"),
    searchExplore("sao"),
  );
});
