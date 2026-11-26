import assert from "node:assert/strict";
import test from "node:test";
import { countCarInventory, readCarResultAccounting, recordedCarOfferCount, carResultSummary } from "./carResultAccounting";

const car = (id: string, ...offers: string[]) => ({ id, modelName: "Same model", offers: offers.map(id => ({ id })) });
const pair = (groupCount: number, offerCount: number) => ({ version: 1, groupCount, offerCount });
const query = (groups: number, offers: number) => ({ carResultAccounting: pair(groups, offers) });

test("returned groups and nested offers are separate without modifying inventory", () => {
  const results = [car("provider-a:snapshot:1", "a1", "a2", "a3"), car("provider-a:snapshot:2", "b1", "b2")];
  const before = JSON.stringify(results);
  assert.deepEqual(countCarInventory(results), pair(2, 5));
  assert.equal(JSON.stringify(results), before);
  assert.deepEqual(countCarInventory([]), pair(0, 0));
  const many = Array.from({ length: 549 }, (_, index) => car("snapshot:" + index,
    ...Array.from({ length: index < 351 ? 5 : 4 }, (_, rate) => "rate-" + index + "-" + rate)));
  assert.deepEqual(countCarInventory(many), pair(549, 2547));
});

test("malformed or duplicate group identities remain unknown, not inferred", () => {
  for (const results of [[{}], [car("x")], [car("", "a")], [car("x", "")], [car("x", "a"), car("x", "b")],
    [{ id: "x", offers: [null] }], [{ id: "x", offers: "invalid" }]])
    assert.equal(countCarInventory(results), null);
});

test("only a valid versioned pair matching the scalar is exposed for cars", () => {
  assert.equal(recordedCarOfferCount("CAR", query(549, 2547), 549), 2547);
  assert.equal(recordedCarOfferCount("CAR", query(0, 0), 0), 0);
  assert.equal(recordedCarOfferCount("HOTEL", query(549, 2547), 549), null);
  assert.equal(recordedCarOfferCount("CAR", {}, 0), null);
  assert.equal(readCarResultAccounting(query(549, 2547), 500), null);
  for (const invalid of [pair(2, 1), pair(0, 1), pair(2, -1), pair(2, 2.5),
    pair(2, Number.MAX_SAFE_INTEGER + 1), { ...pair(2, 5), version: 2 }, { ...pair(2, 5), offerCount: "5" }])
    assert.equal(readCarResultAccounting({ carResultAccounting: invalid }, invalid.groupCount), null);
});

test("presentation distinguishes known zero, singular and historical counts", () => {
  assert.equal(carResultSummary(549, 2547), "549 car result groups · 2,547 rental offers");
  assert.equal(carResultSummary(1, 1), "1 car result group · 1 rental offer");
  assert.equal(carResultSummary(0, 0), "0 car result groups · 0 rental offers");
  assert.equal(carResultSummary(549, null), "549 recorded results · Rental offers not recorded");
  assert.equal(carResultSummary(0, undefined), "0 recorded results · Rental offers not recorded");
  assert.equal(carResultSummary(2, 1), "2 recorded results · Rental offers not recorded");
});
