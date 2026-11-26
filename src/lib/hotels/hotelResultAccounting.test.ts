import assert from "node:assert/strict";
import test from "node:test";
import { countHotelInventory, readHotelResultAccounting, recordedHotelPropertyCount, advanceHotelResultAccounting, hotelResultSummary } from "./hotelResultAccounting";
import { groupHotelOffers } from "./groupHotelOffers";
import type { PublicHotelResult } from "@/lib/types";

const pair = (offerCount: number, propertyCount: number) => ({ version: 1, offerCount, propertyCount });
const query = (offers: number, properties: number) => ({ hotelResultAccounting: pair(offers, properties) });
const offer = (id: string, provider: string, propertyGroupId?: string) => ({ id, provider, propertyGroupId, name: "Same name" });

test("returned totals share the website's provider-scoped property identity rule", () => {
  const offers = [
    offer("a1", "Provider A", "property-1"), offer("a2", "Provider A", "property-1"),
    offer("b1", "Provider B", "property-1"), offer("a3", "Provider A", "property-2"),
    offer("unknown1", "Provider A"), offer("unknown2", "Provider A"),
  ];
  const result = countHotelInventory(offers);
  assert.deepEqual(result, pair(6, 5));
  assert.equal(result?.propertyCount, groupHotelOffers(offers as PublicHotelResult[]).length);
  assert.equal(offers.length, 6, "the count never removes rates");
  assert.deepEqual(countHotelInventory([]), pair(0, 0));
  assert.equal(countHotelInventory([{ id: "malformed" }]), null);
});

test("only an exact versioned pair is exposed, zero is distinct from unknown", () => {
  assert.equal(recordedHotelPropertyCount("HOTEL", query(1653, 422), 1653), 422);
  assert.equal(recordedHotelPropertyCount("HOTEL", query(0, 0), 0), 0);
  assert.equal(recordedHotelPropertyCount("FLIGHT", query(1653, 422), 1653), null);
  assert.equal(recordedHotelPropertyCount("HOTEL", {}, 0), null);
  assert.equal(recordedHotelPropertyCount("HOTEL", query(1653, 422), 1900), null);
  for (const invalid of [pair(3, 4), pair(3, 0), pair(3, -1), pair(3, 1.5), {...pair(3, 1), version: 2}, {...pair(3, 1), propertyCount: "1"}]) {
    assert.equal(readHotelResultAccounting({hotelResultAccounting: invalid}, 3), null);
  }
});

test("progressive updates retain one matched pair and preserve original trusted metadata", () => {
  const original = { ...query(500, 120), environment: "staging", operationalHotelSnapshotId: "original", searchNetwork: { countryCode: "NG" } };
  const next = advanceHotelResultAccounting(original, 500, { ...query(1100, 290), environment: "production", operationalHotelSnapshotId: "wrong" }, 1100);
  assert.deepEqual(next, { ...original, ...query(1100, 290) });
  assert.deepEqual(advanceHotelResultAccounting(next, 1100, query(500, 120), 500), next);
  assert.deepEqual(advanceHotelResultAccounting(next, 1100, query(0, 0), 0), next);
  assert.deepEqual(advanceHotelResultAccounting(next, 1100, query(1100, 280), 1100), next);
  const final = advanceHotelResultAccounting(next, 1100, query(1653, 422), 1653);
  assert.deepEqual(readHotelResultAccounting(final, 1653), pair(1653, 422));
  const unavailable = advanceHotelResultAccounting(final, 1653, {}, 1900);
  assert.equal(readHotelResultAccounting(unavailable, 1900), null, "never reuse a smaller count for larger inventory");
  assert.equal(unavailable.operationalHotelSnapshotId, "original");
  assert.deepEqual(advanceHotelResultAccounting({}, 500, query(500, 120), 500), query(500, 120));
});

test("labels never present a legacy offer count as a known property count", () => {
  assert.equal(hotelResultSummary(1653, 422), "422 property groups · 1,653 offers");
  assert.equal(hotelResultSummary(0, 0), "0 property groups · 0 offers");
  assert.equal(hotelResultSummary(1, 1), "1 property group · 1 offer");
  assert.equal(hotelResultSummary(1653, null), "Property groups not recorded · 1,653 recorded results");
  assert.equal(hotelResultSummary(0, undefined), "Property groups not recorded · 0 recorded results");
  assert.equal(hotelResultSummary(2, 3), "Property groups not recorded · 2 recorded results");
});
