import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import {
  destinations,
  destinationByAirportCode,
  deriveDestinations,
} from "./destinationCatalogue";
import {
  ALL_DESTINATIONS,
  COUNTRY_DESTINATION_GROUPS,
  destinationCardLayout,
  exactExploreResult,
  EXPLORE_TABS,
  exploreBottomPadding,
  groupDestinationsByCountry,
  searchExplore,
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
  selectFromBrowser,
} from "./exploreInteractionModels";
import {
  parseSavedDestinationIds,
  resolveSavedDestinationIds,
} from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";

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

test("country groups contain every catalogue destination exactly once with real counts", () => {
  const grouped = COUNTRY_DESTINATION_GROUPS.flatMap(
    (group) => group.destinations,
  );
  assert.equal(grouped.length, destinations.length);
  assert.equal(
    new Set(grouped.map((destination) => destination.id)).size,
    destinations.length,
  );
  for (const group of COUNTRY_DESTINATION_GROUPS) {
    assert.ok(group.destinations.length > 0);
    assert.ok(
      group.destinations.every(
        (destination) =>
          destination.country === group.country &&
          destination.countryCode === group.countryCode,
      ),
    );
  }
});

test("countries and their destinations are deterministically ordered", () => {
  assert.deepEqual(
    groupDestinationsByCountry([...destinations].reverse()),
    COUNTRY_DESTINATION_GROUPS,
  );
  const countryLabels = COUNTRY_DESTINATION_GROUPS.map(
    (group) => `${group.country}|${group.countryCode}`,
  );
  assert.deepEqual(
    countryLabels,
    [...countryLabels].sort((a, b) => a.localeCompare(b)),
  );
  for (const group of COUNTRY_DESTINATION_GROUPS) {
    const labels = group.destinations.map(
      (destination) => `${destination.name}|${destination.id}`,
    );
    assert.deepEqual(
      labels,
      [...labels].sort((a, b) => a.localeCompare(b)),
    );
  }
});

test("a country See all collection contains only that country's destinations", () => {
  for (const group of COUNTRY_DESTINATION_GROUPS) {
    assert.ok(
      group.destinations.every(
        (destination) => destination.countryCode === group.countryCode,
      ),
    );
  }
});

test("maintained naming is correct in the shared catalogue", () => {
  assert.equal(destinationByAirportCode.get("DPS")?.name, "Bali");
  assert.ok(result("Denpasar").some((item) => item.id === "id-bali"));
  assert.ok(result("Ngurah Rai").some((item) => item.id === "id-bali"));
  assert.equal(destinationByAirportCode.get("IST")?.name, "Istanbul");
  assert.notEqual(destinationByAirportCode.get("IST")?.name, "Cappadocia");
});

test("search covers names, countries, ISO codes, airport codes, airport names, aliases and interests", () => {
  for (const [query, id] of [
    ["London", "gb-london"],
    ["LHR", "gb-london"],
    ["Paris", "fr-paris"],
    ["CDG", "fr-paris"],
    ["Bali", "id-bali"],
    ["DPS", "id-bali"],
    ["IST", "tr-istanbul"],
    ["Beach escapes", "id-bali"],
    ["City skylines", "us-new-york"],
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

test("former featured destinations remain in their correct country groups", () => {
  assert.deepEqual(
    POPULAR_DESTINATIONS.map((item) => item.destination.id),
    APPROVED_FEATURED_IDS,
  );
  const groupedCountryById = new Map(
    COUNTRY_DESTINATION_GROUPS.flatMap((group) =>
      group.destinations.map((destination) => [
        destination.id,
        group.countryCode,
      ] as const),
    ),
  );
  for (const destinationId of APPROVED_FEATURED_IDS) {
    assert.equal(
      groupedCountryById.get(destinationId),
      POPULAR_DESTINATIONS.find(
        (item) => item.destination.id === destinationId,
      )?.destination.countryCode,
    );
  }
  assert.equal(groupedCountryById.get("ng-lagos"), "NG");
  assert.equal(groupedCountryById.get("ng-abuja"), "NG");
  assert.equal(groupedCountryById.get("gh-accra"), "GH");
  assert.equal(groupedCountryById.get("fr-paris"), "FR");
  assert.equal(groupedCountryById.get("gb-london"), "GB");
  assert.equal(groupedCountryById.get("it-rome"), "IT");
  assert.equal(groupedCountryById.get("ae-dubai"), "AE");
  assert.equal(groupedCountryById.get("jp-tokyo"), "JP");
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

test("Explore keeps only the focused tabs and supported actions", () => {
  assert.deepEqual(EXPLORE_TABS, ["Destinations", "Inspiration"]);
  const source = screen();
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
  assert.match(source, /label="Search flights"/);
  assert.match(source, /label="Search hotels"/);
  assert.match(source, /Save destination/);
  assert.match(source, /Remove from saved destinations/);
  assert.doesNotMatch(
    source,
    /destination-detail|Coming soon|\/cars|\/price-alerts/,
  );
});

test("popular destinations are one vertical virtualized stack", () => {
  const source = screen();
  assert.match(source, /FlatList/);
  assert.match(source, /data=\{POPULAR_DESTINATIONS\}/);
  assert.match(source, /Popular destinations/);
  assert.doesNotMatch(source, /<SectionList|COUNTRY_DESTINATION_GROUPS/);
  const destinationsView = source.slice(
    source.indexOf("function Destinations"),
    source.indexOf("function Inspiration"),
  );
  assert.doesNotMatch(destinationsView, /horizontal/);
  assert.doesNotMatch(source, /See all destinations in|countryCount|countryHeader/);
  assert.match(source, /destinationMedia\(destination.id\)/);
  assert.match(source, /results\.map\(\(r\) =>/);
  assert.match(source, /Search flights to/);
});

test("Explore has no saved destinations section or saved empty state", () => {
  const source = screen();
  assert.doesNotMatch(source, /Saved destinations/);
  assert.doesNotMatch(source, /No saved destinations yet/);
  assert.doesNotMatch(source, /savedDestinations/);
  assert.match(source, /const \{ savedIds, toggle \} = useSavedDestinations\(\)/);
  assert.match(source, /results\.map\(\(r\) =>[\s\S]*?onToggle=\{\(\) => toggle\(r\.destination\.id\)\}/);
});

test("default destinations use only the curated list without a featured carousel", () => {
  const source = screen();
  assert.deepEqual(
    POPULAR_DESTINATIONS.map((item) => item.destination.id),
    CURATED_POPULAR_DESTINATION_IDS,
  );
  assert.equal(new Set(CURATED_POPULAR_DESTINATION_IDS).size, 25);
  assert.doesNotMatch(source, /Featured destinations/);
  assert.doesNotMatch(source, /Browse all destinations/);
  assert.doesNotMatch(source, /FEATURED_DESTINATIONS/);
  assert.match(source, /ListHeaderComponent=\{[\s\S]*?\{header\}[\s\S]*?Popular destinations/);
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
