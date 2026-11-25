import assert from "node:assert/strict";
import test from "node:test";
import {
  writeFlightResultsReturnView, readFlightResultsReturnView, peekFlightResultsReturnView,
  type FlightResultsReturnView,
} from "./flightResultsReturnView";

function store() {
  const records = new Map<string, string>();
  return { records,
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
    removeItem: (key: string) => { records.delete(key); } };
}
const href = "/flights/results?origin=LOS&destination=LHR&sort=fastest";
const base: Omit<FlightResultsReturnView, "version" | "savedAt"> = { searchKey: "LOS|LHR|2026-12-15", href, validUntil: 400_000,
  resultIds: ["flight-2", "kayak-sandbox:abc", "flight-1"], sortMode: "fastest",
  journeyTimeMaximums: { return: { takeoff: 600, landing: null } },
  kayakOffers: [], kayakCriteria: { origin: "LOS", destination: "LHR" } };

test("return view preserves exact result order and only matches the original criteria/URL", () => {
  const storage = store();
  writeFlightResultsReturnView(base, storage, 100);
  const restored = readFlightResultsReturnView(base.searchKey, href, storage, 101);
  assert.deepEqual(restored?.resultIds, ["flight-2", "kayak-sandbox:abc", "flight-1"]);
  assert.equal(restored?.sortMode, "fastest");
  assert.deepEqual(restored?.journeyTimeMaximums, { return: { takeoff: 600, landing: null } });
  assert.equal(peekFlightResultsReturnView(href, storage, 101)?.searchKey, base.searchKey);
  assert.equal(readFlightResultsReturnView("new search", href, storage, 101), null);
  assert.equal(readFlightResultsReturnView(base.searchKey, href + "&sort=cheapest", storage, 101), null);
});

test("expired provider quotes are never treated as fresh or extended by returning", () => {
  const storage = store();
  writeFlightResultsReturnView({ ...base, validUntil: 180 }, storage, 100);
  assert.ok(readFlightResultsReturnView(base.searchKey, href, storage, 179));
  assert.equal(readFlightResultsReturnView(base.searchKey, href, storage, 180), null);
  assert.equal(peekFlightResultsReturnView(href, storage, 200), null);
});

test("mobile journey time limits must be validated before replay", () => {
  const storage = store();
  writeFlightResultsReturnView(base, storage, 100);
  const key = [...storage.records.keys()][0];
  const data = JSON.parse(storage.records.get(key) || "{}");
  data.journeyTimeMaximums = { return: { takeoff: 999999, landing: null } };
  storage.records.set(key, JSON.stringify(data));
  assert.equal(readFlightResultsReturnView(base.searchKey, href, storage, 101), null);
});

test("only known flight sort modes are trusted when restoring", () => {
  const storage = store();
  writeFlightResultsReturnView(base, storage, 100);
  const key = [...storage.records.keys()][0];
  const data = JSON.parse(storage.records.get(key) || "{}");
  data.sortMode = "untrusted";
  storage.records.set(key, JSON.stringify(data));
  assert.equal(readFlightResultsReturnView(base.searchKey, href, storage, 101), null);
});

test("unrelated pages, excess results and unavailable storage fail closed", () => {
  const storage = store();
  writeFlightResultsReturnView({ ...base, href: "/cars/results" }, storage, 100);
  assert.equal(storage.records.size, 0);
  writeFlightResultsReturnView({ ...base, resultIds: Array.from({ length: 4_001 }, (_, i) => String(i)) }, storage, 100);
  assert.equal(storage.records.size, 0);
  assert.doesNotThrow(() => writeFlightResultsReturnView(base, null));
  assert.equal(readFlightResultsReturnView(base.searchKey, href, null), null);
});
