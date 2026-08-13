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
  searchExplore,
  searchExploreRegion,
} from "./exploreModels";

const screenSource = () =>
  readFileSync("src/features/explore/ExploreRegionScreen.tsx", "utf8");

test("flat regional catalogues provide complete, unique canonical coverage", () => {
  const regionalIds: string[] = [];
  const expectedTotals = [54, 64, 52, 16, 6, 10, 15, 18];

  EXPLORE_REGIONS.forEach((region, index) => {
    const regional = DESTINATIONS_BY_REGION.get(region)!;
    assert.equal(regional.length, expectedTotals[index]);
    assert.ok(
      regional.every(
        (destination) => exploreRegionForDestination(destination) === region,
      ),
    );
    assert.equal(new Set(regional.map(({ id }) => id)).size, regional.length);
    regionalIds.push(...regional.map(({ id }) => id));
  });

  assert.equal(regionalIds.length, 235);
  assert.equal(new Set(regionalIds).size, 235);
  assert.deepEqual(
    new Set(regionalIds),
    new Set(destinations.map(({ id }) => id)),
  );
});

test("region screen browses the canonical regional order without country sections", () => {
  const source = screenSource();
  assert.match(
    source,
    /searchActive \? \(\s*<FlatList[\s\S]*?renderItem={[\s\S]*?<DestinationResultRow[\s\S]*?\/>\s*\)}\s*\/>\s*\) : \(/,
  );
  const browseList = source.slice(source.lastIndexOf(") : ("));
  assert.ok(
    browseList.indexOf("<FlatList") <
      browseList.indexOf("data={allDestinations}"),
  );
  assert.ok(
    browseList.indexOf("data={allDestinations}") <
      browseList.indexOf("keyExtractor={(destination) => destination.id}"),
  );
  assert.ok(
    browseList.indexOf("keyExtractor={(destination) => destination.id}") <
      browseList.indexOf("<RegionBrowseDestinationCard"),
  );
  assert.doesNotMatch(
    source,
    /SectionList|countrySections|renderSectionHeader|countryHeader|countryName|countryCount/,
  );
  assert.match(source, /destinationDetailsRoute\(destination\.id\)/);
});

test("empty regional browsing uses responsive Popular-style destination cards", () => {
  const source = screenSource();
  const originalInset = Number(
    source.match(/REGION_BROWSE_HORIZONTAL_INSET = ([\d.]+);/)?.[1],
  );
  const cardInset = Number(
    source.match(/REGION_BROWSE_CARD_HORIZONTAL_INSET = ([\d.]+);/)?.[1],
  );
  const aspectRatio = Number(
    source.match(/REGION_BROWSE_IMAGE_ASPECT_RATIO = ([\d.]+);/)?.[1],
  );
  const imageHeightRatio = Number(
    source.match(/REGION_BROWSE_IMAGE_HEIGHT_RATIO = ([\d.]+);/)?.[1],
  );

  assert.ok(aspectRatio > 1 && aspectRatio < 2);
  assert.ok(imageHeightRatio >= 0.58 && imageHeightRatio <= 0.62);
  assert.ok(Math.abs(1 - imageHeightRatio - 0.4) < Number.EPSILON);
  assert.equal(originalInset, 18);
  assert.equal(cardInset, 8);
  assert.ok(cardInset < originalInset);
  assert.match(
    source,
    /screenWidth - REGION_BROWSE_CARD_HORIZONTAL_INSET \* 2/,
  );
  assert.match(source, /header: \{ paddingHorizontal: 18 \}/);
  assert.match(
    source,
    /list: \{ paddingHorizontal: REGION_BROWSE_HORIZONTAL_INSET \}/,
  );
  assert.match(
    source,
    /browseList: \{ paddingHorizontal: REGION_BROWSE_CARD_HORIZONTAL_INSET \}/,
  );
  assert.match(source, /const imageHeight = width \/ REGION_BROWSE_IMAGE_ASPECT_RATIO/);
  assert.match(source, /const height = imageHeight \/ REGION_BROWSE_IMAGE_HEIGHT_RATIO/);
  assert.match(source, /informationHeight: height - imageHeight/);
  for (const screenWidth of [320, 360, 390, 430]) {
    const width = Math.max(240, screenWidth - cardInset * 2);
    const imageHeight = width / aspectRatio;
    const height = imageHeight / imageHeightRatio;
    assert.equal(imageHeight / height, 0.6);
    assert.ok(Math.abs((height - imageHeight) / height - 0.4) < 1e-10);
    assert.equal(width, screenWidth - cardInset * 2);
    assert.equal(width - (screenWidth - originalInset * 2), 20);
  }
  assert.match(source, /browseCard:[\s\S]*?borderRadius: 16/);
  assert.match(source, /browseImage: {[\s\S]*?width: "100%"/);
  assert.match(
    source,
    /style=\{\[s\.browseImage, \{ height: layout\.imageHeight, backgroundColor: theme\.border \}\]\}/,
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
    /<Text style=\{\[s\.browseName, \{ color: theme\.textPrimary \}\]\}>\{destination\.name\}<\/Text>\s*<Text style=\{\[s\.browseCountry, \{ color: theme\.textSecondary \}\]\}> · \{destination\.country\}<\/Text>/,
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
  const multiDestinationCountry = EXPLORE_REGIONS.flatMap((region) => {
    const regional = DESTINATIONS_BY_REGION.get(region)!;
    return regional.map((destination) => ({ region, destination, regional }));
  }).find(({ destination, regional }) =>
    regional.filter(
      (candidate) => candidate.country === destination.country,
    ).length > 1,
  )!;
  const { region, destination, regional } = multiDestinationCountry;
  const expectedCountryIds = regional
    .filter((candidate) => candidate.country === destination.country)
    .map(({ id }) => id);

  assert.deepEqual(
    searchExploreRegion(destination.country, region).map(
      ({ destination: result }) => result.id,
    ),
    expectedCountryIds,
  );
  assert.ok(
    searchExploreRegion(destination.country, region).every(
      ({ destination: result }) => result.country === destination.country,
    ),
  );
  const otherRegion = EXPLORE_REGIONS.find((candidate) => candidate !== region)!;
  assert.deepEqual(searchExploreRegion(destination.country, otherRegion), []);
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
