import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import { destinations, destinationByAirportCode, deriveDestinations } from "./destinationCatalogue";
import { ALL_DESTINATIONS, destinationCardLayout, exactExploreResult, EXPLORE_TABS, exploreBottomPadding, searchExplore } from "./exploreModels";
import { FEATURED_DESTINATIONS } from "./exploreData";
import { DESTINATION_MEDIA, assertDestinationMediaIsValid } from "./destinationMedia";
import { navigateFromDestination, selectFromBrowser } from "./exploreInteractionModels";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";

const screen = () => readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");
const result = (query: string) => searchExplore(query).map((item) => item.destination);
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
};

test("global airports derive a stable, unique, complete destination catalogue", () => {
  assert.equal(airports.length, 248);
  assert.equal(destinations.length, 234);
  assert.equal(new Set(destinations.map((item) => item.countryCode)).size, 162);
  assert.equal(destinations.filter((item) => item.airportCodes.length > 1).length, 11);
  assert.equal(ALL_DESTINATIONS, destinations);
  assert.equal(new Set(destinations.map((item) => item.id)).size, destinations.length);
  const codes = destinations.flatMap((item) => item.airportCodes);
  assert.equal(new Set(codes).size, codes.length);
  for (const destination of destinations) {
    assert.match(destination.id, /^[a-z]{2}-[a-z0-9-]+$/);
    assert.match(destination.countryCode, /^[A-Z]{2}$/);
    assert.ok(destination.airportCodes.length);
    assert.ok(destination.airportCodes.includes(destination.primaryAirportCode));
  }
  assert.deepEqual(deriveDestinations([...airports].reverse()), destinations);
});

test("metropolitan grouping and maintained naming are correct", () => {
  const london = destinationByAirportCode.get("LHR")!;
  for (const code of ["LHR", "LGW", "LCY", "STN", "LTN"]) assert.equal(destinationByAirportCode.get(code)?.id, london.id);
  assert.equal(destinationByAirportCode.get("CDG")?.id, destinationByAirportCode.get("ORY")?.id);
  assert.equal(destinationByAirportCode.get("DPS")?.name, "Bali");
  assert.ok(result("Denpasar").some((item) => item.id === "id-bali"));
  assert.ok(result("Ngurah Rai").some((item) => item.id === "id-bali"));
  assert.equal(destinationByAirportCode.get("IST")?.name, "Istanbul");
  assert.notEqual(destinationByAirportCode.get("IST")?.name, "Cappadocia");
});

test("search covers names, countries, ISO codes, airport codes, airport names, aliases and interests", () => {
  for (const [query, id] of [["London", "gb-london"], ["LHR", "gb-london"], ["Gatwick", "gb-london"], ["ORY", "fr-paris"], ["Bali", "id-bali"], ["DPS", "id-bali"], ["IST", "tr-istanbul"], ["Beach escapes", "id-bali"], ["City skylines", "us-new-york"]]) {
    assert.equal(result(query)[0]?.id, id);
  }
  assert.ok(result("United Kingdom").every((item) => item.countryCode === "GB"));
  assert.ok(result("GB").every((item) => item.countryCode === "GB"));
  assert.equal(result("Nigeria").length, airports.filter((item) => item.countryCode === "NG").length);
  assert.deepEqual(searchExplore("sao"), searchExplore("São"));
  assert.equal(new Set(result("United").map((item) => item.id)).size, result("United").length);
  const ranks = searchExplore("on").map((item) => item.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(exactExploreResult(searchExplore("LHR"))?.id, "gb-london");
});

test("featured IDs and media manifest are explicit and valid", () => {
  assert.deepEqual(FEATURED_DESTINATIONS.map((item) => item.destination.id), ["fr-paris", "id-bali", "gb-london", "us-new-york"]);
  assert.doesNotThrow(assertDestinationMediaIsValid);
  assert.equal(DESTINATION_MEDIA.length, 3);
});

test("saved v1 values resolve to stable destination IDs safely and idempotently", () => {
  assert.deepEqual(parseSavedDestinationIds("not json"), []);
  assert.deepEqual(parseSavedDestinationIds('["LHR",2,null]'), ["LHR"]);
  const migrated = resolveSavedDestinationIds(["LHR", "LGW", "London", "bad", "", "gb-london"]);
  assert.deepEqual(migrated, ["gb-london"]);
  assert.deepEqual(resolveSavedDestinationIds(migrated), migrated);
  assert.equal(resolveSavedDestinationIds(["ORY"])[0], "fr-paris");
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
  for (const removed of ["Compare", "Price alerts", "Quick destinations", "Explore more", "Browse countries", "Browse regions", "Track prices"]) {
    assert.doesNotMatch(source, new RegExp(removed, "i"));
  }
  assert.match(source, /label="Search flights"/);
  assert.match(source, /label="Search hotels"/);
  assert.match(source, /Save destination/);
  assert.match(source, /Remove from saved destinations/);
  assert.doesNotMatch(source, /destination-detail|Coming soon|\/cars|\/price-alerts/);
});

test("browse all is virtualized and retains action selection", () => {
  const source = screen();
  assert.match(source, /FlatList/);
  assert.match(source, /data=\{browser\?\.destinations/);
  assert.match(source, /selectFromBrowser/);
  assert.match(source, /Browse all destinations/);
});

test("handoff closes first, preserves grouped codes, and blocks duplicate navigation", () => {
  const destination = destinationByAirportCode.get("LHR")!;
  const events: string[] = [];
  const lock = { current: false };
  const navigate = (product: string, name: string, handoff: { airportCodes: readonly string[] }) => events.push(`${product}:${name}:${handoff.airportCodes.join(",")}`);
  navigateFromDestination(destination, "flights", () => events.push("close"), navigate, lock);
  navigateFromDestination(destination, "flights", () => events.push("close"), navigate, lock);
  assert.equal(events[0], "close");
  assert.match(events[1]!, /LHR,LGW,LCY,STN,LTN/);
});

test("browser selection can defer opening actions until after close", () => {
  const destination = destinationByAirportCode.get("CDG")!;
  const events: string[] = [];
  const scheduled: Array<() => void> = [];
  selectFromBrowser(destination, () => events.push("close"), (item) => events.push(`open:${item.id}`), (open) => scheduled.push(open));
  assert.deepEqual(events, ["close"]);
  scheduled[0]?.();
  assert.deepEqual(events, ["close", "open:fr-paris"]);
});

test("a stale read cannot replace a newer optimistic toggle", async () => {
  const read = deferred<string[]>();
  const writes: string[][] = [];
  const store = new SavedDestinationsStore(() => read.promise, async (ids) => { writes.push([...ids]); });
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
  const store = new SavedDestinationsStore(async () => stored, async (ids) => { await write.promise; stored = [...ids]; });
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
  const store = new SavedDestinationsStore(async () => stored, async (ids) => { stored = [...ids]; });
  await Promise.all([store.toggle("fr-paris").catch(() => undefined), store.toggle("fr-paris").catch(() => undefined)]);
  assert.deepEqual(stored, []);
  await Promise.all([store.toggle("fr-paris"), store.toggle("gb-london")]);
  assert.deepEqual(new Set(stored), new Set(["fr-paris", "gb-london"]));
});

test("failed writes reconcile and later actions recover", async () => {
  let stored: string[] = [];
  let fail = true;
  const store = new SavedDestinationsStore(async () => stored, async (ids) => {
    if (fail) { fail = false; throw new Error("write failed"); }
    stored = [...ids];
  });
  await assert.rejects(store.toggle("fr-paris"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual([...store.snapshot()], []);
  await store.toggle("gb-london");
  assert.deepEqual(stored, ["gb-london"]);
});

test("Explore remains factual", () => {
  const source = screen();
  for (const claim of ["Best Price", "Trending", "Top destinations", "ranking", "deal"]) assert.doesNotMatch(source, new RegExp(claim, "i"));
});
