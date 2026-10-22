import test from "node:test";
import assert from "node:assert/strict";
import { rememberHotelReturnSnapshot, readHotelReturnSnapshot } from "./hotelReturnSnapshot";

test("return snapshot is isolated by search and expires without extending on read", () => {
  rememberHotelReturnSnapshot("a", [], 1000);
  assert.deepEqual(readHotelReturnSnapshot("a", 2000), { results: [] });
  assert.equal(readHotelReturnSnapshot("other", 2000), null);
  assert.equal(readHotelReturnSnapshot("a", 301000), null);
});
test("return snapshots are bounded to two searches", () => {
  rememberHotelReturnSnapshot("one", [], 400000);
  rememberHotelReturnSnapshot("two", [], 400000);
  rememberHotelReturnSnapshot("three", [], 400000);
  assert.equal(readHotelReturnSnapshot("one", 400001), null);
  assert.ok(readHotelReturnSnapshot("two", 400001));
  assert.ok(readHotelReturnSnapshot("three", 400001));
});
