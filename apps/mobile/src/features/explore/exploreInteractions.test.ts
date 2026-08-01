import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import {
  countries,
  destinationCardLayout,
  destinationSections,
  exactExploreResult,
  exploreActionCardLayout,
  exploreBottomPadding,
  REGION_BY_AIRPORT,
  regions,
  searchExplore,
  shouldShowExploreFloatingAction,
} from "./exploreModels";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";
import { navigateFromDestination, selectFromBrowser } from "./exploreInteractionModels";

const screen = () => readFileSync("src/features/explore/ExplorePhotoFirstScreen.tsx", "utf8");

test("Explore search handles empty, exact, partial, code, countries, aliases, interests and unknown terms", () => {
  assert.deepEqual(searchExplore(""), []);
  assert.equal(searchExplore(" Paris ")[0]?.airport.code, "CDG");
  assert.equal(searchExplore("lon")[0]?.airport.code, "LHR");
  assert.equal(searchExplore("dxb")[0]?.airport.city, "Dubai");
  assert.deepEqual(searchExplore("France").map((item) => item.airport.code), ["CDG"]);
  assert.deepEqual(searchExplore("USA").map((item) => item.airport.code), ["LAX", "JFK"]);
  assert.deepEqual(searchExplore("United   States").map((item) => item.airport.code), ["LAX", "JFK"]);
  for (const query of ["United", "United St", "States"]) {
    const codes = searchExplore(query).map((item) => item.airport.code);
    assert.ok(codes.includes("LAX"));
    assert.ok(codes.includes("JFK"));
  }
  assert.equal(new Set(searchExplore("United").map((item) => item.airport.code)).size, searchExplore("United").length);
  assert.equal(searchExplore("Beaches")[0]?.match, "interest");
  assert.deepEqual(searchExplore("unknown"), []);
});

test("ranking is exact, prefix, contains and deterministic", () => {
  const results = searchExplore("on");
  assert.ok(results.every((item, index) => index === 0 || results[index - 1]!.rank <= item.rank));
  assert.deepEqual(searchExplore("usa"), searchExplore("USA"));
});

test("exact search submission only resolves one exact result", () => {
  assert.equal(exactExploreResult(searchExplore("Paris"))?.code, "CDG");
  assert.equal(exactExploreResult(searchExplore("Par")), undefined);
  assert.equal(exactExploreResult([]), undefined);
});

test("country, code, and interest searches remain supported", () => {
  assert.deepEqual(searchExplore("United Kingdom").map((item) => item.airport.code), ["LHR"]);
  assert.deepEqual(searchExplore("Dubai").map((item) => item.airport.code), ["DXB"]);
  assert.equal(searchExplore("Beaches")[0]?.match, "interest");
});

test("saved identifiers migrate legacy cities and discard malformed or unknown data", () => {
  assert.deepEqual(resolveSavedDestinationIds(parseSavedDestinationIds('["Paris","DXB","unknown",42]')), ["CDG", "DXB"]);
  assert.deepEqual(parseSavedDestinationIds("bad"), []);
  assert.deepEqual(resolveSavedDestinationIds(["New York", "JFK"]), ["JFK"]);
});

test("countries and maintained regions cover the current catalogue", () => {
  assert.equal(Object.keys(REGION_BY_AIRPORT).length, airports.length);
  assert.equal(countries().flatMap((group) => group.destinations).length, airports.length);
  assert.equal(regions().flatMap((group) => group.destinations).length, airports.length);
  assert.equal(countries().find((group) => group.name === "United States")?.destinations.length, 2);
  assert.equal(REGION_BY_AIRPORT.IST, "Türkiye (catalogue grouping)");
});

test("photo-first destination sections use truthful catalogue counts and maintained leads", () => {
  const sections = destinationSections();
  assert.deepEqual(sections.map((section) => [section.name, section.lead.code]), [
    ["Europe", "CDG"],
    ["Southeast Asia", "DPS"],
    ["North America", "JFK"],
  ]);
  for (const section of sections) {
    assert.ok(section.destinations.some((airport) => airport.code === section.lead.code));
    assert.equal(section.destinations.length, regions().find((group) => group.name === section.name)?.destinations.length);
  }
});

test("responsive calculations support narrow phones, action grids and tab clearance", () => {
  for (const width of [320, 360, 400]) {
    const layout = destinationCardLayout(width);
    assert.ok(layout.cardWidth < width - 36);
    assert.equal(layout.snapInterval, layout.cardWidth + layout.gap);
  }
  assert.equal(exploreActionCardLayout(320).columns, 1);
  assert.equal(exploreActionCardLayout(360).columns, 2);
  assert.equal(exploreActionCardLayout(400).columns, 2);
  assert.equal(exploreBottomPadding(65, 24), 107);
});

test("floating Browse all action appears only for an unobstructed Destinations tab", () => {
  assert.equal(shouldShowExploreFloatingAction({ tab: "Destinations", queryActive: false, keyboardVisible: false, modalOpen: false }), true);
  assert.equal(shouldShowExploreFloatingAction({ tab: "Inspiration", queryActive: false, keyboardVisible: false, modalOpen: false }), false);
  assert.equal(shouldShowExploreFloatingAction({ tab: "Destinations", queryActive: true, keyboardVisible: false, modalOpen: false }), false);
  assert.equal(shouldShowExploreFloatingAction({ tab: "Destinations", queryActive: false, keyboardVisible: true, modalOpen: false }), false);
  assert.equal(shouldShowExploreFloatingAction({ tab: "Destinations", queryActive: false, keyboardVisible: false, modalOpen: true }), false);
});

test("destination actions and discovery surfaces use supported routes", () => {
  const source = screen();
  for (const route of ["/flights", "/hotels", "/cars", "/price-alerts"]) assert.match(source, new RegExp(route));
  assert.match(source, /Destination actions/);
  assert.match(source, /Browse countries/);
  assert.match(source, /Browse regions/);
  assert.match(source, /Saved destinations/);
  assert.match(source, /Compare/);
  assert.match(source, /Browse all destinations/);
  assert.doesNotMatch(source, /destination-detail|Coming soon|onPress=\{\(\) => undefined\}/);
});

test("catalogue and inspiration remain truthful", () => {
  const source = screen();
  assert.match(source, /destinations:\s*airports/);
  assert.match(source, /Interest match/);
  assert.match(source, /Explore \{slide.destination\}/);
  assert.equal((source.match(/Quick destinations/g) || []).length, 1);
  assert.doesNotMatch(source, /destination.*Anywhere|Best Price|Trending|Top destinations|Map view|from \$|discount|recommended for you/i);
});

test("Hotels delegates complete route state and featured selections to its focused panel", () => {
  const source = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");
  assert.match(source, /checkIn\?: string \| string\[\]/);
  assert.match(source, /<HotelSearchPanel ref=\{panel\} params=\{params\}/);
  assert.match(source, /panel\.current\?\.useDestination\(destination\)/);
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
};

test("a stale read cannot replace a newer optimistic toggle", async () => {
  const read = deferred<string[]>();
  const writes: string[][] = [];
  const store = new SavedDestinationsStore(() => read.promise, async (ids) => { writes.push([...ids]); });
  const refreshing = store.refresh();
  await Promise.resolve();
  await store.toggle("CDG");
  read.resolve([]);
  await refreshing;
  assert.deepEqual([...store.snapshot()], ["CDG"]);
  assert.deepEqual(writes, [["CDG"]]);
});

test("a focus refresh waits for a pending write", async () => {
  let stored: string[] = [];
  const write = deferred<void>();
  const store = new SavedDestinationsStore(async () => stored, async (ids) => {
    await write.promise;
    stored = [...ids];
  });
  const saving = store.toggle("CDG");
  const refresh = store.refresh();
  assert.deepEqual([...store.snapshot()], ["CDG"]);
  write.resolve();
  await saving;
  await refresh;
  assert.deepEqual([...store.snapshot()], ["CDG"]);
});

test("rapid toggles and saves serialize final intent", async () => {
  let stored: string[] = [];
  const store = new SavedDestinationsStore(async () => stored, async (ids) => { stored = [...ids]; });
  await Promise.all([store.toggle("CDG").catch(() => undefined), store.toggle("CDG").catch(() => undefined)]);
  assert.deepEqual(stored, []);
  await Promise.all([store.toggle("CDG"), store.toggle("DXB")]);
  assert.deepEqual(new Set(stored), new Set(["CDG", "DXB"]));
});

test("failed writes reconcile and later actions recover", async () => {
  let stored: string[] = [];
  let fail = true;
  const store = new SavedDestinationsStore(async () => stored, async (ids) => {
    if (fail) {
      fail = false;
      throw new Error("write failed");
    }
    stored = [...ids];
  });
  await assert.rejects(store.toggle("CDG"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual([...store.snapshot()], []);
  await store.toggle("DXB");
  assert.deepEqual(stored, ["DXB"]);
});

test("subscribers share updates and unsubscribed consumers stop receiving them", async () => {
  const store = new SavedDestinationsStore(async () => [], async () => undefined);
  const first: string[][] = [];
  const second: string[][] = [];
  store.subscribe((ids) => first.push([...ids]));
  const unsubscribe = store.subscribe((ids) => second.push([...ids]));
  await store.toggle("CDG");
  unsubscribe();
  await store.toggle("DXB");
  assert.deepEqual(first, [["CDG"], ["CDG", "DXB"]]);
  assert.deepEqual(second, [["CDG"]]);
});

test("destination navigation captures params and closes first", () => {
  const airport = airports.find((item) => item.code === "CDG")!;
  for (const product of ["flights", "hotels"] as const) {
    const events: string[] = [];
    const lock = { current: false };
    navigateFromDestination(airport, product, () => events.push("close"), (route, destination) => events.push(`${route}:${destination}`), lock);
    navigateFromDestination(airport, product, () => events.push("close"), (route, destination) => events.push(`${route}:${destination}`), lock);
    assert.deepEqual(events, ["close", `${product}:Paris`]);
  }
});

test("browser selection closes before opening destination actions", () => {
  const events: string[] = [];
  selectFromBrowser(airports[0]!, () => events.push("close"), (airport) => events.push(`open:${airport.code}`));
  assert.deepEqual(events, ["close", `open:${airports[0]!.code}`]);
});

test("browser selection can defer actions until its close render is scheduled", () => {
  const events: string[] = [];
  const scheduled: (() => void)[] = [];
  selectFromBrowser(airports[0]!, () => events.push("close"), (airport) => events.push(`open:${airport.code}`), (open) => scheduled.push(open));
  assert.deepEqual(events, ["close"]);
  scheduled[0]?.();
  assert.deepEqual(events, ["close", `open:${airports[0]!.code}`]);
});
