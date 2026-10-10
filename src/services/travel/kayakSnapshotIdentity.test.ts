import test from "node:test";
import assert from "node:assert/strict";
import { scopeKayakOfferIds } from "./kayakMetasearchProvider";

test("reused provider row IDs cannot replace an earlier search's property", () => {
  const first = scopeKayakOfferIds([{ id: "960:0", title: "First property", price: 100 }], "search-a");
  const second = scopeKayakOfferIds([{ id: "960:0", title: "Different property", price: 200 }], "search-b");
  const cache = new Map([...first, ...second].map((offer) => [offer.id, offer]));
  assert.notEqual(first[0].id, second[0].id);
  assert.equal(cache.get(first[0].id)?.title, "First property");
  assert.equal(cache.get(second[0].id)?.title, "Different property");
});

test("scoping preserves every supplied field and distinct offer without mutating input", () => {
  const offers = [{ id: "1:0", image: "image-a", details: ["fact"] }, { id: "1:1", image: "image-b", details: [] }];
  const scoped = scopeKayakOfferIds(offers, "snapshot");
  assert.equal(scoped.length, offers.length);
  scoped.forEach((offer, index) => assert.deepEqual(offer, { ...offers[index], id: `snapshot:${offers[index].id}` }));
  assert.equal(offers[0].id, "1:0");
});
