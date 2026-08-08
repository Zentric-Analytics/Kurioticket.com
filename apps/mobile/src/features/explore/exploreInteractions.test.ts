import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import {
  destinations,
  destinationByAirportCode,
  destinationById,
  deriveDestinations,
} from "./destinationCatalogue";
import { requireExploreDestination } from "../../../../../src/shared/destinations/exploreDestinationContent";
import {
  ALL_DESTINATIONS,
  destinationCardLayout,
  exactExploreResult,
  exploreBottomPadding,
  formatFlightAccess,
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

test("popular destinations are one vertical virtualized stack", () => {
  const source = screen();
  assert.match(source, /FlatList/);
  assert.match(source, /data=\{POPULAR_DESTINATIONS\}/);
  assert.match(source, /Popular destinations/);
  assert.doesNotMatch(source, /<SectionList|COUNTRY_DESTINATION_GROUPS/);
  const discoveryView = source.slice(
    source.indexOf("function ExploreDiscoveryContent"),
    source.indexOf("const shadow"),
  );
  assert.doesNotMatch(discoveryView, /horizontal/);
  assert.doesNotMatch(source, /See all destinations in|countryCount|countryHeader/);
  assert.match(source, /destinationMedia\(destination.id\)/);
  assert.match(source, /data=\{results\}/);
});

test("popular destination names keep city and country inline and accessible", () => {
  const source = screen();
  const card = source.slice(
    source.indexOf("function PopularDestinationCard"),
    source.indexOf("function ExploreDiscoveryContent"),
  );
  const styles = source.slice(source.indexOf("const s = StyleSheet.create"));

  assert.match(card, /accessibilityLabel=\{`\$\{destination\.name\}, \$\{destination\.country\}`\}/);
  assert.match(card, /numberOfLines=\{1\}/);
  assert.match(card, /ellipsizeMode="tail"/);
  assert.match(
    card,
    /<Text style=\{s\.popularCardTitle\}>\{destination\.name\}<\/Text>\s*<Text style=\{s\.countryName\}> • \{destination\.country\}<\/Text>/,
  );
  assert.match(styles, /popularCardTitle:[\s\S]*?fontWeight: "800"/);
  assert.match(styles, /countryName: \{ color: MUTED/);
  assert.match(styles, /popularImage: \{ width: "100%", height: 220/);
});


test("popular destination cards end after airport access without a flight action", () => {
  const source = screen();
  const card = source.slice(
    source.indexOf("function PopularDestinationCard"),
    source.indexOf("function ExploreDiscoveryContent"),
  );
  const styles = source.slice(source.indexOf("const s = StyleSheet.create"));

  assert.doesNotMatch(card, /Search flights|searchFlights|name="flight"/);
  assert.doesNotMatch(card, /Tap to explore|See more|View details|Learn more|Explore more/);
  assert.doesNotMatch(styles, /flightButton|flightButtonText/);
  assert.match(styles, /popularCopy: \{ padding: 14, gap: 3 \}/);
});

test("popular destination cards present shared summaries before concise flight access", () => {
  const source = screen();
  const card = source.slice(
    source.indexOf("function PopularDestinationCard"),
    source.indexOf("function ExploreDiscoveryContent"),
  );

  assert.match(card, /destination\.summary \? \(/);
  assert.match(card, /numberOfLines=\{3\}/);
  assert.match(card, /ellipsizeMode="tail"/);
  assert.match(card, /\{destination\.summary\}/);
  assert.ok(
    card.indexOf("{destination.summary}") <
      card.indexOf("formatFlightAccess("),
  );
  assert.doesNotMatch(card, /destination\.airportNames/);
  assert.doesNotMatch(card, /landmark architecture|major museums|food traditions/);

  const styles = source.slice(source.indexOf("const s = StyleSheet.create"));
  assert.match(styles, /destinationSummary:[\s\S]*?fontSize: 14[\s\S]*?lineHeight: 20[\s\S]*?flexShrink: 1/);
  assert.match(styles, /airportMeta:[\s\S]*?fontSize: 12[\s\S]*?flexShrink: 1/);
  assert.doesNotMatch(source, /Platform\.OS/);
});

test("flight access formatter keeps the primary first and removes duplicate codes", () => {
  assert.equal(formatFlightAccess("CDG", ["CDG"]), "Flights via CDG");
  assert.equal(
    formatFlightAccess("CDG", ["ORY", "CDG"]),
    "Flights via CDG and ORY",
  );
  assert.equal(
    formatFlightAccess("LHR", ["LGW", "LHR", "STN", "LGW", "LTN"]),
    "Flights via LHR + 3 more",
  );
  assert.equal(
    formatFlightAccess("CDG", ["cdg", "ORY"]),
    "Flights via CDG and ORY",
  );
});

test("popular destination card and save heart keep independent actions", () => {
  const source = screen();
  const card = source.slice(
    source.indexOf("function PopularDestinationCard"),
    source.indexOf("function ExploreDiscoveryContent"),
  );

  assert.match(card, /accessibilityLabel=\{`Open details for \$\{destination\.name\}, \$\{destination\.country\}`\}/);
  assert.match(card, /onPress=\{onSelect\}/);
  assert.match(card, /label=\{`\$\{saved \? "Remove" : "Save"\} \$\{destination\.name\}`\}/);
  assert.match(card, /onPress=\{onToggle\}/);
  assert.match(
    card,
    /<Pressable[\s\S]*?onPress=\{onSelect\}[\s\S]*?<Image[\s\S]*?<View style=\{s\.popularCopy\}>[\s\S]*?<\/Pressable>\s*<AndroidFavoriteButton[\s\S]*?onPress=\{onToggle\}/,
  );
});

test("destination detail action buttons stay on their existing shared styles", () => {
  const details = readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");
  assert.match(details, /<Action label="Search flights" icon="flight" onPress=\{searchFlights\} \/>/);
  assert.match(details, /<Action label="Search hotels" icon="hotel" onPress=\{searchHotels\} secondary \/>/);
  assert.match(details, /primaryButton: \{ minHeight: 52/);
});

test("Explore has no saved destinations section or saved empty state", () => {
  const source = screen();
  assert.doesNotMatch(source, /Saved destinations/);
  assert.doesNotMatch(source, /No saved destinations yet/);
  assert.doesNotMatch(source, /savedDestinations/);
  assert.match(source, /const \{ savedIds, toggle \} = useSavedDestinations\(\)/);
  assert.match(source, /onToggle=\{\(\) => toggle\(r\.destination\.id\)\}/);
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
  assert.match(source, /ListHeaderComponent=\{<Section title="Popular destinations"/);
});

test("Explore keeps one controlled search input mounted above changing content", () => {
  const source = screen();
  assert.equal(source.match(/<TextInput\n/g)?.length, 1);
  assert.match(source, /value=\{query\}[\s\S]*?onChangeText=\{setQuery\}/);
  assert.match(source, /<SafeAreaView[\s\S]*?<ExploreHeader[\s\S]*?\{isSearching \? \(/);
  assert.doesNotMatch(source, /if \(query\.trim\(\)\)\s*return/);
  assert.doesNotMatch(source, /setTimeout|onChangeText=.*blur|onChangeText=.*focus/);
  assert.equal(source.match(/keyboardDismissMode="none"/g)?.length, 2);
  assert.equal(source.match(/keyboardShouldPersistTaps="handled"/g)?.length, 2);
});

test("Explore search preserves successive characters and clearing restores discovery", () => {
  assert.equal(result("L").some((item) => item.id === "gb-london"), true);
  for (const query of ["Lo", "Lon", "Lond", "Londo", "London"])
    assert.equal(result(query).some((item) => item.id === "gb-london"), true);
  assert.equal(result("London")[0]?.id, "gb-london");
  assert.deepEqual(searchExplore(""), []);
  const source = screen();
  assert.match(source, /onPress=\{\(\) => \{\s*setQuery\(""\);\s*input\.current\?\.focus\(\);/);
  assert.match(source, /isSearching \? \([\s\S]*?data=\{results\}[\s\S]*?: \([\s\S]*?<ExploreDiscoveryContent/);
});

test("Explore uses destination-only search copy", () => {
  const source = screen();
  assert.equal(
    source.match(/Search destinations or airports/g)?.length,
    2,
  );
});


test("destination details render shared records and omit absent optional content", () => {
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
  const nonEditorial = destinations.find(
    (destination) => !CURATED_POPULAR_DESTINATION_IDS.includes(
      destination.id as (typeof CURATED_POPULAR_DESTINATION_IDS)[number],
    ),
  )!;
  assert.equal(nonEditorial.summary, undefined);
  assert.equal(nonEditorial.description, undefined);
  assert.equal(nonEditorial.highlights, undefined);
  assert.equal(nonEditorial.relatedDestinationIds, undefined);
  assert.doesNotMatch(source, /editorialProvenance|sourceReferences|lastVerifiedAt/);
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
