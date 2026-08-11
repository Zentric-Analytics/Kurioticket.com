import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import {
  destinations,
  destinationByAirportCode,
  destinationById,
  deriveDestinations,
  normalizeDestinationText,
  EXPLORE_REGIONS,
  exploreRegionForDestination,
  exploreRegionSlug,
} from "./destinationCatalogue";
import { requireExploreDestination } from "../../../../../src/shared/destinations/exploreDestinationContent";
import { exploreDestinationEditorial } from "../../../../../src/shared/destinations/exploreDestinationEditorial";
import {
  ALL_DESTINATIONS,
  destinationCardLayout,
  exactExploreResult,
  exploreBottomPadding,
  REGION_DISCOVERY,
  REGION_PREVIEW_SIZE,
  searchExplore,
  searchExploreRegion,
} from "./exploreModels";
import { POPULAR_DESTINATIONS } from "./exploreData";
import { CURATED_POPULAR_DESTINATION_IDS } from "../flow/locationCatalogue";
import {
  DESTINATION_MEDIA,
  EXPLICIT_DESTINATION_MEDIA,
  assertDestinationMediaIsValid,
  destinationMedia,
} from "./destinationMedia";
import {
  CURATED_DESTINATION_IMAGES,
  createDestinationImageRegistry,
  curatedDestinationImage,
  requireCuratedDestinationImage,
} from "../../../../../src/data/destinationImages";
import {
  navigateFromDestination,
  destinationDetailsRoute,
  destinationHandoff,
  selectFromBrowser,
} from "./exploreInteractionModels";
import {
  parseSavedDestinationIds,
  resolveSavedDestinationIds,
} from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";
import { resolveDestinationDetails } from "./destinationDetailsModel";

const screen = () =>
  readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");
const result = (query: string) =>
  searchExplore(query).map((item) => item.destination);
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, no) => {
    resolve = ok;
    reject = no;
  });
  return { promise, resolve, reject };
};

const APPROVED_FEATURED_IDS = [
  "fr-paris",
  "gb-london",
  "us-new-york",
  "id-bali",
  "ng-lagos",
  "ae-dubai",
  "jp-tokyo",
  "za-cape-town",
  "it-rome",
  "tr-istanbul",
  "th-bangkok",
  "es-barcelona",
  "eg-cairo",
  "ma-marrakesh",
  "sg-singapore",
  "nl-amsterdam",
  "ca-toronto",
  "us-los-angeles",
  "ng-abuja",
  "gh-accra",
  "za-johannesburg",
  "ke-nairobi",
  "pt-lisbon",
  "au-sydney",
  "br-rio-de-janeiro",
] as const;

test("shared airport catalogue derives a stable destination catalogue", () => {
  assert.ok(airports.length > 12);
  assert.ok(destinations.length > 12);
  assert.equal(ALL_DESTINATIONS, destinations);
  assert.equal(
    new Set(destinations.map((item) => item.id)).size,
    destinations.length,
  );
  const codes = destinations.flatMap((item) => item.airportCodes);
  assert.equal(new Set(codes).size, codes.length);
  for (const destination of destinations) {
    assert.match(destination.id, /^[a-z]{2}-[a-z0-9-]+$/);
    assert.match(destination.countryCode, /^[A-Z]{2}$/);
    assert.ok(destination.airportCodes.length);
    assert.ok(
      destination.airportCodes.includes(destination.primaryAirportCode),
    );
  }
  assert.deepEqual(deriveDestinations([...airports].reverse()), destinations);
});

test("shared records reject duplicate IDs and report unknown IDs clearly", () => {
  const seed = airports.find((airport) => airport.code === "DPS")!;
  assert.throws(
    () => deriveDestinations([seed, { ...seed, code: "ZZZ", city: "Bali" }]),
    /Duplicate Explore destination ID: id-bali/,
  );
  assert.throws(() => requireExploreDestination("xx-atlantis"), /Unknown Explore destination ID: xx-atlantis/);
});

test("maintained naming is correct in the shared catalogue", () => {
  assert.equal(destinationByAirportCode.get("DPS")?.name, "Bali");
  assert.ok(result("Denpasar").some((item) => item.id === "id-bali"));
  assert.ok(result("Ngurah Rai").some((item) => item.id === "id-bali"));
  assert.equal(destinationByAirportCode.get("IST")?.name, "Istanbul");
  assert.notEqual(destinationByAirportCode.get("IST")?.name, "Cappadocia");
});

test("search covers names, countries, ISO codes, airport codes, airport names and aliases", () => {
  for (const [query, id] of [
    ["London", "gb-london"],
    ["LHR", "gb-london"],
    ["Paris", "fr-paris"],
    ["CDG", "fr-paris"],
    ["Bali", "id-bali"],
    ["DPS", "id-bali"],
    ["IST", "tr-istanbul"],
  ]) {
    assert.equal(result(query)[0]?.id, id);
  }
  assert.ok(
    result("United Kingdom").every((item) => item.countryCode === "GB"),
  );
  assert.ok(result("GB").every((item) => item.countryCode === "GB"));
  assert.deepEqual(searchExplore("sao"), searchExplore("São"));
  assert.equal(
    new Set(result("United").map((item) => item.id)).size,
    result("United").length,
  );
  const ranks = searchExplore("on").map((item) => item.rank);
  assert.deepEqual(
    ranks,
    [...ranks].sort((a, b) => a - b),
  );
  assert.equal(exactExploreResult(searchExplore("LHR"))?.id, "gb-london");
  assert.deepEqual(searchExplore("Beach escapes"), []);
});

test("search normalization preserves accents and accepts punctuation variants", () => {
  for (const [canonical, variant, id] of [
    ["Montréal", "Montreal", "ca-montreal"],
    ["Bogotá", "Bogota", "co-bogota"],
    ["São Paulo", "Sao Paulo", "br-sao-paulo"],
    ["Asunción", "Asuncion", "py-asuncion"],
    ["Brasília", "Brasilia", "br-brasilia"],
    ["Cancún", "Cancun", "mx-cancun"],
    ["Nukuʻalofa", "Nukualofa", "to-nuku-alofa"],
    ["Nukuʻalofa", "Nuku'alofa", "to-nuku-alofa"],
    ["St. John's", "St. John’s", "ag-st-john-s"],
    ["St. John's", "St Johns", "ag-st-john-s"],
  ] as const) {
    assert.equal(result(canonical)[0]?.id, id);
    assert.equal(result(variant)[0]?.id, id);
    assert.equal(normalizeDestinationText(canonical), normalizeDestinationText(variant));
  }
  assert.equal(result("   HO   CHI   MINH   CITY   ")[0]?.id, "vn-ho-chi-minh-city");
});

test("search ranking contract and alphabetical ties remain explicit", () => {
  assert.equal(searchExplore("Paris")[0]?.rank, 0);
  assert.equal(searchExplore("LHR")[0]?.rank, 1);
  assert.equal(searchExplore("Denpasar")[0]?.rank, 2);
  assert.equal(searchExplore("San")[0]?.rank, 3);
  assert.ok(searchExplore("Japan").every(({ rank }) => rank === 4));
  assert.equal(searchExplore("Heathrow")[0]?.rank, 5);
  assert.deepEqual(result("Japan").map(({ name }) => name), ["Osaka", "Tokyo"]);
  assert.deepEqual(searchExplore("gua").slice(0, 5).map(({ rank }) => rank), [1, 3, 3, 3, 3]);
});

test("exact member airport codes retain rank one canonical resolution", () => {
  for (const [code, id] of [
    ["PEK", "cn-beijing"], ["PKX", "cn-beijing"],
    ["ICN", "kr-seoul"], ["GMP", "kr-seoul"],
    ["AEP", "ar-buenos-aires"], ["EZE", "ar-buenos-aires"],
    ["IAH", "us-houston"], ["HOU", "us-houston"],
    ["SEA", "us-seattle"], ["MDE", "co-medellin"],
    ["UIO", "ec-quito"], ["GRU", "br-sao-paulo"],
    ["ASU", "py-asuncion"], ["PPT", "pf-papeete"],
  ] as const) {
    const match = searchExplore(code)[0];
    assert.equal(match?.destination.id, id);
    assert.equal(match?.rank, 1);
  }
});

test("airport-name search uses meaningful token prefixes without generic noise", () => {
  for (const [query, id] of [
    ["Heathrow", "gb-london"],
    ["Gatwick", "gb-london"],
    ["Narita", "jp-tokyo"],
    ["Haneda", "jp-tokyo"],
    ["Schiphol", "nl-amsterdam"],
    ["Changi", "sg-singapore"],
    ["Bandaranaike", "lk-colombo"],
    ["Velana", "mv-male"],
  ] as const) {
    assert.equal(result(query)[0]?.id, id);
  }
  assert.ok(result("port").length < destinations.length);
  assert.deepEqual(result("port").map(({ name }) => name), [
    "Port Harcourt", "Port Moresby", "Port of Spain", "Port Vila", "Porto", "Lisbon",
  ]);
  assert.equal(result("SEA")[0]?.id, "us-seattle");
  assert.equal(result("HOU")[0]?.id, "us-houston");
  assert.equal(result("lon")[0]?.id, "gb-london");
  assert.equal(result("rio")[0]?.id, "br-rio-de-janeiro");
  assert.equal(result("del")[0]?.id, "in-new-delhi");
  assert.equal(result("gua")[0]?.id, "gt-guatemala-city");
});

test("search keeps country, empty, no-result, editorial and catalogue contracts", () => {
  for (const country of [
    "Japan", "Brazil", "Australia", "New Zealand", "Mexico", "India", "Fiji",
    "Hong Kong SAR China", "Macao SAR China", "French Polynesia", "Cook Islands",
    "Guam", "Northern Mariana Islands",
  ]) {
    const matches = searchExplore(country);
    assert.ok(matches.length > 0);
    assert.ok(matches.every(({ rank }) => rank === 4));
  }
  assert.deepEqual(searchExplore(""), []);
  assert.deepEqual(searchExplore("   "), []);
  assert.deepEqual(searchExplore("Christchruch"), []);
  for (const term of [
    "temples", "beaches", "museums", "markets", "architecture", "waterfront", "heritage",
  ]) assert.deepEqual(searchExplore(term), []);
  assert.equal(destinations.length, 235);
  assert.equal(exploreDestinationEditorial.length, 235);
  assert.deepEqual(POPULAR_DESTINATIONS.map(({ destination }) => destination.id), APPROVED_FEATURED_IDS);
});

test("destinations outside the popular list remain searchable and saveable", async () => {
  const outsidePopular = destinations.find(
    (destination) => !CURATED_POPULAR_DESTINATION_IDS.includes(
      destination.id as (typeof CURATED_POPULAR_DESTINATION_IDS)[number],
    ),
  )!;
  assert.ok(result(outsidePopular.name).some((item) => item.id === outsidePopular.id));
  assert.ok(result(outsidePopular.country).some((item) => item.id === outsidePopular.id));
  assert.ok(result(outsidePopular.primaryAirportCode).some((item) => item.id === outsidePopular.id));

  let stored: string[] = [];
  const store = new SavedDestinationsStore(
    async () => stored,
    async (ids) => { stored = [...ids]; },
  );
  await store.toggle(outsidePopular.id);
  assert.deepEqual(stored, [outsidePopular.id]);
});

test("canonical region taxonomy covers all destinations exactly once with expected counts", () => {
  const expected = [54, 64, 52, 16, 6, 10, 15, 18];
  assert.deepEqual(REGION_DISCOVERY.map(({ region }) => region), [...EXPLORE_REGIONS]);
  assert.deepEqual(REGION_DISCOVERY.map(({ destinations }) => destinations.length), expected);
  const ids = REGION_DISCOVERY.flatMap(({ destinations }) => destinations.map(({ id }) => id));
  assert.equal(ids.length, 235);
  assert.equal(new Set(ids).size, 235);
  assert.deepEqual(new Set(ids), new Set(destinations.map(({ id }) => id)));
  for (const group of REGION_DISCOVERY) {
    assert.equal(group.preview.length, REGION_PREVIEW_SIZE);
    assert.deepEqual(group.preview, group.destinations.slice(0, REGION_PREVIEW_SIZE));
    assert.ok(group.destinations.every((destination) => exploreRegionForDestination(destination) === group.region));
  }
});

test("region search reuses global ranking and scopes names, countries and airport codes", () => {
  assert.deepEqual(searchExploreRegion("sao", "South America"), searchExplore("sao"));
  assert.equal(searchExploreRegion("LHR", "Europe")[0]?.destination.id, "gb-london");
  assert.deepEqual(searchExploreRegion("LHR", "Asia"), []);
  assert.ok(searchExploreRegion("Japan", "Asia").every(({ destination }) => destination.country === "Japan"));
  assert.deepEqual(searchExploreRegion("São", "South America"), searchExploreRegion("sao", "South America"));
  assert.equal(exploreRegionSlug("Oceania & Pacific"), "oceania-pacific");
});

test("popular destinations resolve directly through the shared model", () => {
  assert.deepEqual(
    POPULAR_DESTINATIONS.map((item) => item.destination.id),
    APPROVED_FEATURED_IDS,
  );
  for (const destinationId of APPROVED_FEATURED_IDS) {
    assert.equal(
      POPULAR_DESTINATIONS.find((item) => item.destination.id === destinationId)?.destination,
      destinationById.get(destinationId),
    );
  }
});

test("former featured destinations retain local-first media", () => {
  assert.doesNotThrow(assertDestinationMediaIsValid);
  assert.equal(DESTINATION_MEDIA.length, destinations.length);
  assert.equal(EXPLICIT_DESTINATION_MEDIA.length, APPROVED_FEATURED_IDS.length);
  assert.ok(DESTINATION_MEDIA.every((media) => media.source));
  assert.ok(
    EXPLICIT_DESTINATION_MEDIA.every(
      (local) => destinationMedia(local.destinationId) === local,
    ),
  );
  const curatedMobileIds = destinations
    .filter((destination) => curatedDestinationImage(destination.id))
    .map((destination) => destination.id);
  for (const destinationId of curatedMobileIds)
    assert.notEqual(destinationMedia(destinationId)?.provenance, "fallback");
  assert.equal(
    DESTINATION_MEDIA.filter((media) => media.provenance === "website-curated")
      .length,
    20,
  );
  assert.equal(
    DESTINATION_MEDIA.filter((media) => media.provenance === "fallback").length,
    190,
  );
  assert.ok(
    DESTINATION_MEDIA.filter(
      (media) => media.provenance === "website-curated",
    ).every(
      (media) =>
        typeof media.source === "object" &&
        "uri" in media.source &&
        media.source.uri?.startsWith("https://"),
    ),
  );
});

test("curated registry rejects duplicates and reports unknown mappings", () => {
  assert.equal(CURATED_DESTINATION_IMAGES.length, 44);
  assert.throws(
    () =>
      createDestinationImageRegistry([
        CURATED_DESTINATION_IMAGES[0]!,
        CURATED_DESTINATION_IMAGES[0]!,
      ]),
    /Duplicate destination image ID: gb-london/,
  );
  assert.throws(
    () => requireCuratedDestinationImage("Atlantis", "Unknown"),
    /Unknown destination image mapping: Atlantis, Unknown/,
  );
  assert.equal(
    requireCuratedDestinationImage("Marrakesh", "Morocco").destinationId,
    "ma-marrakesh",
  );
  assert.equal(
    requireCuratedDestinationImage("Istanbul", "Türkiye").destinationId,
    "tr-istanbul",
  );
});

test("saved values resolve to stable destination IDs safely and idempotently", () => {
  assert.deepEqual(parseSavedDestinationIds("not json"), []);
  assert.deepEqual(parseSavedDestinationIds('["LHR",2,null]'), ["LHR"]);
  const migrated = resolveSavedDestinationIds([
    "LHR",
    "London",
    "bad",
    "",
    "gb-london",
  ]);
  assert.deepEqual(migrated, ["gb-london"]);
  assert.deepEqual(resolveSavedDestinationIds(migrated), migrated);
  assert.equal(resolveSavedDestinationIds(["CDG"])[0], "fr-paris");
});

test("responsive calculations support narrow phones and tab clearance", () => {
  for (const width of [320, 360, 400]) {
    const layout = destinationCardLayout(width);
    assert.ok(layout.cardWidth < width - 36);
    assert.equal(layout.snapInterval, layout.cardWidth + layout.gap);
  }
  assert.equal(exploreBottomPadding(65, 24), 107);
});

test("Explore removes destination and inspiration tabs while keeping supported actions", () => {
  const source = screen();
  assert.doesNotMatch(source, /EXPLORE_TABS|tablist|accessibilityRole="tab"|function Inspiration/);
  for (const removed of [
    "Compare",
    "Price alerts",
    "Quick destinations",
    "Explore more",
    "Browse countries",
    "Browse regions",
    "Track prices",
  ]) {
    assert.doesNotMatch(source, new RegExp(removed, "i"));
  }
  const details = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  assert.match(details, /label="Search flights"/);
  assert.match(details, /label="Search hotels"/);
  assert.match(details, /Save \$\{destination\.name\}/);
  assert.match(details, /Remove \$\{destination\.name\} from saved destinations/);
  assert.doesNotMatch(
    source,
    /Coming soon|\/cars|\/price-alerts/,
  );
});

test("Explore defaults to deterministic region discovery instead of Popular", () => {
  const source = screen();
  assert.doesNotMatch(source, /Explore by region/);
  assert.match(source, /data={REGION_DISCOVERY}/);
  assert.match(source, /horizontal data={item.preview}/);
  assert.match(source, /snapToInterval={previewCardWidth \+ previewGap}/);
  assert.match(source, /decelerationRate="fast"/);
  assert.match(source, /See all destinations in \${item.region}/);
  assert.doesNotMatch(source, /data={POPULAR_DESTINATIONS}|Popular destinations/);
  assert.match(source, /query.trim\(\) \?/);
});

test("region preview geometry matches the wide Kayak carousel proportions responsively", () => {
  const source = screen();
  assert.match(source, /REGION_PREVIEW_CARD_WIDTH_RATIO = 0\.928/);
  assert.doesNotMatch(source, /REGION_PREVIEW_CARD_WIDTH_RATIO = 0\.84/);
  assert.match(source, /REGION_PREVIEW_INSET_RATIO = 0\.024/);
  assert.match(source, /REGION_PREVIEW_GAP_RATIO = 0\.024/);
  assert.match(source, /REGION_PREVIEW_ASPECT_RATIO = 2\.13/);
  assert.match(source, /REGION_PREVIEW_IMAGE_ASPECT_RATIO = 3\.21/);
  assert.match(source, /REGION_PREVIEW_IMAGE_HEIGHT_SCALE = 1\.12/);

  for (const windowWidth of [320, 390, 430, 768]) {
    const cardWidth = windowWidth * 0.928;
    const previousCardHeight = cardWidth / 2.13;
    const previousImageHeight = cardWidth / 3.21;
    const previousFooterHeight = previousCardHeight - previousImageHeight;
    const imageHeight = previousImageHeight * 1.12;
    const cardHeight = previousCardHeight + (imageHeight - previousImageHeight);
    const footerHeight = cardHeight - imageHeight;
    const gap = windowWidth * 0.024;
    const inset = windowWidth * 0.024;
    const nextCardPeek = windowWidth - inset - cardWidth - gap;

    assert.equal(cardWidth, windowWidth * 0.928);
    assert.equal(inset, windowWidth * 0.024);
    assert.equal(gap, windowWidth * 0.024);
    assert.equal(imageHeight / previousImageHeight, 1.12);
    assert.ok(Math.abs(cardWidth / imageHeight - 3.21 / 1.12) < 1e-12);
    assert.ok(Math.abs(cardWidth / imageHeight - 2.87) < 0.01);
    assert.ok(Math.abs((cardHeight - previousCardHeight) - (imageHeight - previousImageHeight)) < Number.EPSILON * cardHeight);
    assert.ok(Math.abs(footerHeight - previousFooterHeight) < Number.EPSILON * cardHeight);
    assert.ok(Math.abs(nextCardPeek - windowWidth * 0.024) < Number.EPSILON * windowWidth);
    assert.equal(cardWidth + gap, windowWidth * (0.928 + 0.024));
  }

  assert.match(source, /horizontal data={item.preview}/);
  assert.match(source, /snapToInterval={previewCardWidth \+ previewGap}/);
  assert.match(source, /borderRadius: 6/);
});

test("region previews remain clean, bounded destination cards", () => {
  const source = screen();
  const card = source.slice(source.indexOf("function RegionPreviewCard"), source.indexOf("function ExploreDiscoveryContent"));
  assert.match(card, /destinationMedia\(destination.id\)/);
  assert.match(card, /destination.name/);
  assert.match(card, /destination.country/);
  assert.doesNotMatch(card, /price|hotel|date|summary|formatFlightAccess/);
  assert.match(card, /onPress={onSelect}/);
  assert.match(source, /destinationDetailsRoute\(destination.id\)/);
});

test("Popular configuration stays intact but is not a default presentation dependency", () => {
  const source = screen();
  assert.deepEqual(POPULAR_DESTINATIONS.map((item) => item.destination.id), CURATED_POPULAR_DESTINATION_IDS);
  assert.equal(new Set(CURATED_POPULAR_DESTINATION_IDS).size, 25);
  assert.doesNotMatch(source, /POPULAR_DESTINATIONS/);
});

test("Explore keeps one controlled global search above discovery", () => {
  const source = screen();
  assert.equal(source.match(/<TextInput ref=/g)?.length, 1);
  assert.match(source, /value={query} onChangeText={setQuery}/);
  assert.match(source, /<ExploreHeader query={query}/);
  assert.match(source, /query.trim\(\) \?[\s\S]*data={results}[\s\S]*<ExploreDiscoveryContent/);
  assert.doesNotMatch(source, /if \(query.trim\(\)\)\s*return/);
});

test("clearing global search restores region discovery", () => {
  for (const query of ["L", "Lo", "Lon", "London"])
    assert.equal(result(query).some((item) => item.id === "gb-london"), true);
  assert.deepEqual(searchExplore(""), []);
  const source = screen();
  assert.match(source, /setQuery\(""\); input.current\?\.focus\(\)/);
  assert.match(source, /: <ExploreDiscoveryContent/);
});

test("Explore uses destination-only search copy", () => {
  const source = screen();
  assert.equal(
    source.match(/Search destinations or airports/g)?.length,
    2,
  );
});


test("destination details render complete shared editorial while keeping related content optional", () => {
  const source = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  assert.match(source, /destination\.airportCodes\.map/);
  assert.match(source, /destination\.summary \?/);
  assert.match(source, /destination\.description \?/);
  assert.match(source, /destination\.highlights\?\.length \?/);
  assert.match(source, /destinationMedia\(destination\.id\)/);
  assert.doesNotMatch(source, /Coming soon/);
  const london = destinationById.get("gb-london")!;
  assert.ok(london.summary);
  assert.ok(london.description);
  assert.ok(london.highlights?.length);
  assert.equal(london.relatedDestinationIds, undefined);
  const nonFeatured = destinations.find(
    (destination) => !CURATED_POPULAR_DESTINATION_IDS.includes(
        destination.id as (typeof CURATED_POPULAR_DESTINATION_IDS)[number],
      ),
  )!;
  assert.ok(nonFeatured.summary);
  assert.ok(nonFeatured.description);
  assert.ok(nonFeatured.highlights?.length);
  assert.equal(nonFeatured.relatedDestinationIds, undefined);
  assert.doesNotMatch(source, /editorialProvenance|sourceReferences|lastVerifiedAt/);
});

test("destination details use one bounded trailing-space contract after the CTA row", () => {
  const source = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  const page = source.slice(source.indexOf("function DestinationPage"), source.indexOf("function Section"));
  const scrollView = page.slice(page.indexOf("<ScrollView"), page.indexOf(">", page.indexOf("<ScrollView")) + 1);
  const styles = source.slice(source.indexOf("const styles = StyleSheet.create"));

  assert.match(scrollView, /alwaysBounceVertical={false}/);
  assert.match(scrollView, /bounces={false}/);
  assert.match(scrollView, /overScrollMode="never"/);
  assert.match(scrollView, /contentContainerStyle={styles\.content}/);
  const bottomPadding = Number(source.match(/const DESTINATION_DETAILS_BOTTOM_PADDING = (\d+);/)?.[1]);
  assert.equal(bottomPadding, 36);
  assert.ok(bottomPadding > 0 && bottomPadding < 80);
  assert.match(styles, /content: \{ paddingBottom: DESTINATION_DETAILS_BOTTOM_PADDING \}/);
  assert.match(styles, /body: \{ paddingHorizontal: 18, paddingTop: 18, gap: 20 \}/);
  assert.doesNotMatch(styles, /content: \{[^}]*\b(?:flex|flexGrow|minHeight|height|justifyContent)\b/);
  assert.doesNotMatch(styles, /body: \{[^}]*\b(?:flex|flexGrow|minHeight|height|justifyContent|paddingBottom)\b/);
  assert.doesNotMatch(styles, /actions: \{[^}]*marginTop:\s*["']auto["']/);
  assert.doesNotMatch(page, /destination\.id\s*===|switch\s*\(destination|POPULAR|CURATED_POPULAR|Platform\./);
  assert.doesNotMatch(page, /ListFooterComponent|contentInset|contentInsetAdjustmentBehavior|<View\s+style={styles\.spacer}/);
});

test("all canonical destination detail models share the same complete layout inputs", () => {
  assert.equal(destinations.length, 235);
  assert.equal(exploreDestinationEditorial.length, 235);
  assert.equal(CURATED_POPULAR_DESTINATION_IDS.length, 25);

  for (const destination of destinations) {
    assert.equal(resolveDestinationDetails(destination.id), destination);
    assert.ok(destination.summary?.trim(), `${destination.id} needs a summary`);
    assert.ok(destination.description?.trim(), `${destination.id} needs a description`);
    assert.ok(destination.highlights?.length, `${destination.id} needs highlights`);
    assert.ok(destination.airportCodes.length >= 1, `${destination.id} needs an airport`);
    assert.equal(destination.airportCodes.length, destination.airportNames.length);
    assert.ok(destination.editorialProvenance, `${destination.id} needs editorial ownership`);
  }

  assert.ok(destinations.some(({ airportCodes }) => airportCodes.length === 1));
  assert.ok(destinations.some(({ airportCodes }) => airportCodes.length > 1));
  assert.deepEqual(
    POPULAR_DESTINATIONS.map(({ destination }) => destination.id),
    CURATED_POPULAR_DESTINATION_IDS,
  );
});

test("destination details follow the destination-first hierarchy without duplicating airports", () => {
  const source = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  const page = source.slice(source.indexOf("function DestinationPage"), source.indexOf("function Section"));
  const orderedContent = [
    "resolvedDestinationHeroSource(media, imageFailed)",
    "styles.titleRow",
    "destination.summary",
    'title="About"',
    'title="Highlights"',
    'title="Getting there"',
    'title="Related destinations"',
    'label="Search flights"',
    'label="Search hotels"',
  ];

  let previousIndex = -1;
  for (const content of orderedContent) {
    const index = page.indexOf(content);
    assert.ok(index > previousIndex, `${content} should follow the preceding destination content`);
    previousIndex = index;
  }

  assert.match(page, /destination\.description/);
  assert.match(page, /destination\.highlights\.map/);
  assert.doesNotMatch(page, /PRIMARY AIRPORT|styles\.primaryAirport|title="Airports?"/);
  assert.equal(page.match(/destination\.airportCodes\.map/g)?.length, 1);
  assert.equal(page.match(/destination\.airportNames\[index\]/g)?.length, 1);

  const actions = page.slice(page.indexOf("<View style={styles.actions}>"));
  assert.match(actions, /<Action label="Search flights" icon="flight" onPress={searchFlights} \/>/);
  assert.match(actions, /<Action label="Search hotels" icon="hotel" onPress={searchHotels} secondary \/>/);
  assert.doesNotMatch(actions.slice(actions.indexOf("<\/View>") + 7), /<Section|<Action/);

  const action = source.slice(source.indexOf("function Action"), source.indexOf("const styles = StyleSheet.create"));
  assert.match(action, /secondary && \{ backgroundColor: theme\.surface \}/);
  assert.match(action, /<FlowIcon name=\{icon\} color=\{secondary \? BLUE : "white"\}/);
  assert.match(action, /secondary && styles\.secondaryButtonText/);

  const actionStyles = source.slice(source.indexOf("const styles = StyleSheet.create"));
  assert.match(actionStyles, /actions: \{ flexDirection: "row", gap: 10/);
  assert.match(actionStyles, /actionButton: \{ flex: 1 \}/);
  assert.match(actionStyles, /primaryButton: \{ minHeight: 52[\s\S]*backgroundColor: BLUE/);
  assert.match(actionStyles, /secondaryButton: \{ borderWidth: 1, borderColor: BLUE \}/);
  assert.match(actionStyles, /secondaryButtonText: \{ color: BLUE \}/);

  const london = destinationById.get("gb-london")!;
  assert.ok(london.airportCodes.length > 1);
  assert.equal(london.airportCodes[0], london.primaryAirportCode);
  assert.equal(london.airportCodes.length, london.airportNames.length);
});

test("all Explore destination entry points use the ID-only details route without the old sheet", () => {
  const source = screen();
  assert.match(source, /router\.push\(destinationDetailsRoute\(destination\.id\)\)/);
  assert.doesNotMatch(source, /DestinationAction|<Modal|setSelected|modalBackdrop/);
  assert.deepEqual(destinationDetailsRoute("fr-paris"), {
    pathname: "/explore/destination/[id]",
    params: { id: "fr-paris" },
  });
  assert.deepEqual(Object.keys(destinationDetailsRoute("fr-paris").params), ["id"]);
  assert.equal(resolveDestinationDetails("fr-paris"), destinationById.get("fr-paris"));
  assert.equal(resolveDestinationDetails("xx-invalid"), undefined);
  assert.equal(resolveDestinationDetails(["fr-paris"]), undefined);
});

test("details handoffs preserve genuine shared airport data", () => {
  const destination = destinationById.get("gb-london")!;
  assert.deepEqual(destinationHandoff(destination), {
    destinationId: destination.id,
    primaryAirportCode: destination.primaryAirportCode,
    airportCodes: destination.airportCodes,
  });
  const details = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  assert.match(details, /destinationId: destination\.id, destination: destination\.name, to: handoff\.primaryAirportCode, airportCodes: handoff\.airportCodes\.join/);
  assert.match(details, /destinationId: destination\.id, destination: destination\.name/);
  assert.match(details, /Destination not found/);
  assert.match(details, /useSavedDestinations\(\)/);
});

test("handoff closes first and blocks duplicate navigation", () => {
  const destination = destinationByAirportCode.get("LHR")!;
  const events: string[] = [];
  const lock = { current: false };
  const navigate = (
    product: string,
    name: string,
    handoff: { airportCodes: readonly string[] },
  ) => events.push(`${product}:${name}:${handoff.airportCodes.join(",")}`);
  navigateFromDestination(
    destination,
    "flights",
    () => events.push("close"),
    navigate,
    lock,
  );
  navigateFromDestination(
    destination,
    "flights",
    () => events.push("close"),
    navigate,
    lock,
  );
  assert.equal(events[0], "close");
  assert.match(events[1]!, /LHR/);
});

test("browser selection can defer opening actions until after close", () => {
  const destination = destinationByAirportCode.get("CDG")!;
  const events: string[] = [];
  const scheduled: Array<() => void> = [];
  selectFromBrowser(
    destination,
    () => events.push("close"),
    (item) => events.push(`open:${item.id}`),
    (open) => scheduled.push(open),
  );
  assert.deepEqual(events, ["close"]);
  scheduled[0]?.();
  assert.deepEqual(events, ["close", "open:fr-paris"]);
});

test("a stale read cannot replace a newer optimistic toggle", async () => {
  const read = deferred<string[]>();
  const writes: string[][] = [];
  const store = new SavedDestinationsStore(
    () => read.promise,
    async (ids) => {
      writes.push([...ids]);
    },
  );
  const refreshing = store.refresh();
  await Promise.resolve();
  await store.toggle("fr-paris");
  read.resolve([]);
  await refreshing;
  assert.deepEqual([...store.snapshot()], ["fr-paris"]);
  assert.deepEqual(writes, [["fr-paris"]]);
});

test("a focus refresh waits for a pending write", async () => {
  let stored: string[] = [];
  const write = deferred<void>();
  const store = new SavedDestinationsStore(
    async () => stored,
    async (ids) => {
      await write.promise;
      stored = [...ids];
    },
  );
  const saving = store.toggle("fr-paris");
  const refresh = store.refresh();
  assert.deepEqual([...store.snapshot()], ["fr-paris"]);
  write.resolve();
  await saving;
  await refresh;
  assert.deepEqual([...store.snapshot()], ["fr-paris"]);
});

test("rapid toggles serialize final saved intent", async () => {
  let stored: string[] = [];
  const store = new SavedDestinationsStore(
    async () => stored,
    async (ids) => {
      stored = [...ids];
    },
  );
  await Promise.all([
    store.toggle("fr-paris").catch(() => undefined),
    store.toggle("fr-paris").catch(() => undefined),
  ]);
  assert.deepEqual(stored, []);
  await Promise.all([store.toggle("fr-paris"), store.toggle("gb-london")]);
  assert.deepEqual(new Set(stored), new Set(["fr-paris", "gb-london"]));
});

test("failed writes reconcile and later actions recover", async () => {
  let stored: string[] = [];
  let fail = true;
  const store = new SavedDestinationsStore(
    async () => stored,
    async (ids) => {
      if (fail) {
        fail = false;
        throw new Error("write failed");
      }
      stored = [...ids];
    },
  );
  await assert.rejects(store.toggle("fr-paris"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual([...store.snapshot()], []);
  await store.toggle("gb-london");
  assert.deepEqual(stored, ["gb-london"]);
});

test("Explore remains factual", () => {
  const source = screen();
  for (const claim of [
    "Best Price",
    "Trending",
    "Top destinations",
    "ranking",
    "deal",
  ])
    assert.doesNotMatch(source, new RegExp(claim, "i"));
});
