import assert from "node:assert/strict";
import test from "node:test";

import {
  filterHotelsBySavedIds,
  isHotelIdSaved,
  normalizeSavedHotelIds,
  parseSavedHotelIds,
  SAVED_HOTEL_IDS_CHANGED_EVENT,
  serializeSavedHotelIds,
  toggleSavedHotelId,
} from "./hotelSavedStorage";

test("SAVED_HOTEL_IDS_CHANGED_EVENT is namespaced", () => {
  assert.equal(
    SAVED_HOTEL_IDS_CHANGED_EVENT,
    "kurioticket:hotels:saved-ids-changed",
  );
});

test("normalizeSavedHotelIds normalizes only unique non-empty strings", () => {
  assert.deepEqual(normalizeSavedHotelIds(undefined), []);
  assert.deepEqual(normalizeSavedHotelIds(null), []);
  assert.deepEqual(normalizeSavedHotelIds("hotel-a"), []);
  assert.deepEqual(normalizeSavedHotelIds(["a", "b"]), ["a", "b"]);
  assert.deepEqual(normalizeSavedHotelIds([" a ", "\tb\n"]), ["a", "b"]);
  assert.deepEqual(normalizeSavedHotelIds(["", " ", "a"]), ["a"]);
  assert.deepEqual(normalizeSavedHotelIds(["a", 12, null, {}, "b"]), [
    "a",
    "b",
  ]);
  assert.deepEqual(normalizeSavedHotelIds(["a", " b ", "a", "b"]), [
    "a",
    "b",
  ]);
  assert.deepEqual(normalizeSavedHotelIds(["b", "a", "b", "c"]), [
    "b",
    "a",
    "c",
  ]);

  const input = [" a ", "a", "b"];
  assert.deepEqual(normalizeSavedHotelIds(input), ["a", "b"]);
  assert.deepEqual(input, [" a ", "a", "b"]);
});

test("parseSavedHotelIds safely parses and normalizes JSON arrays", () => {
  assert.deepEqual(parseSavedHotelIds(null), []);
  assert.deepEqual(parseSavedHotelIds(""), []);
  assert.deepEqual(parseSavedHotelIds('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseSavedHotelIds('[" a ","a","",12,"b"]'), [
    "a",
    "b",
  ]);
  assert.deepEqual(parseSavedHotelIds("not json"), []);
  assert.deepEqual(parseSavedHotelIds('{"id":"a"}'), []);
  assert.deepEqual(parseSavedHotelIds('"a"'), []);
  assert.doesNotThrow(() => parseSavedHotelIds("["));
});

test("serializeSavedHotelIds writes normalized JSON arrays without mutation", () => {
  assert.deepEqual(JSON.parse(serializeSavedHotelIds(["a", "b"])), [
    "a",
    "b",
  ]);
  assert.equal(serializeSavedHotelIds([" a ", "a", "", "b"]), '["a","b"]');
  assert.equal(serializeSavedHotelIds(["b", "a", "c"]), '["b","a","c"]');

  const input = [" a ", "a", "b"];
  assert.equal(serializeSavedHotelIds(input), '["a","b"]');
  assert.deepEqual(input, [" a ", "a", "b"]);
});

test("isHotelIdSaved checks exact normalized hotel IDs", () => {
  assert.equal(isHotelIdSaved(["a", "b"], "a"), true);
  assert.equal(isHotelIdSaved(["a", "b"], "c"), false);
  assert.equal(isHotelIdSaved(["a", "b"], " b "), true);
  assert.equal(isHotelIdSaved(["a", "b"], " "), false);
  assert.equal(isHotelIdSaved(["a", "b"], 12), false);
});

test("toggleSavedHotelId toggles normalized IDs without mutation", () => {
  assert.deepEqual(toggleSavedHotelId(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleSavedHotelId(["a", "b"], "a"), ["b"]);
  assert.deepEqual(toggleSavedHotelId(["a", "b", "c"], "b"), ["a", "c"]);
  assert.deepEqual(toggleSavedHotelId(["a", " a ", "b"], "b"), ["a"]);
  assert.deepEqual(toggleSavedHotelId(["a"], " b "), ["a", "b"]);
  assert.deepEqual(toggleSavedHotelId([" a ", "a", "b"], " "), ["a", "b"]);

  const input = [" a ", "a", "b"];
  const result = toggleSavedHotelId(input, "c");
  assert.notEqual(result, input);
  assert.deepEqual(result, ["a", "b", "c"]);
  assert.deepEqual(input, [" a ", "a", "b"]);
});

test("filterHotelsBySavedIds returns current-result hotels matching saved IDs", () => {
  const hotels = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
    { id: "c", name: "Gamma" },
  ];

  assert.deepEqual(filterHotelsBySavedIds(hotels, ["c", "a"]), [
    hotels[0],
    hotels[2],
  ]);
  assert.deepEqual(filterHotelsBySavedIds(hotels, ["b", "a"]), [
    hotels[0],
    hotels[1],
  ]);
  assert.deepEqual(filterHotelsBySavedIds(hotels, ["missing", "a"]), [
    hotels[0],
  ]);
});

test("filterHotelsBySavedIds rejects invalid hotel IDs and normalizes consistently", () => {
  const hotels = [
    { id: " a ", name: "Trimmed" },
    { id: "", name: "Empty" },
    { id: " ", name: "Whitespace" },
    { id: 12, name: "Number" },
    { id: null, name: "Null" },
    { id: "b", name: "Beta" },
  ];

  assert.deepEqual(filterHotelsBySavedIds(hotels, ["a", "b"]), [
    hotels[0],
    hotels[5],
  ]);
  assert.deepEqual(filterHotelsBySavedIds(hotels, [" b ", "b", "a"]), [
    hotels[0],
    hotels[5],
  ]);
  assert.deepEqual(filterHotelsBySavedIds(hotels, []), []);
});

test("filterHotelsBySavedIds returns a new array without mutating inputs", () => {
  const hotels = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
  ];
  const savedIds = [" b ", "a"];
  const result = filterHotelsBySavedIds(hotels, savedIds);

  assert.notEqual(result, hotels);
  assert.deepEqual(result, [hotels[0], hotels[1]]);
  assert.deepEqual(hotels, [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
  ]);
  assert.deepEqual(savedIds, [" b ", "a"]);
});
