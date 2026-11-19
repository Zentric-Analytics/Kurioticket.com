import test from "node:test";
import assert from "node:assert/strict";
import type { PublicHotelResult } from "@/lib/types";
import { groupHotelOffers } from "./groupHotelOffers";

test("grouping retains each rate and the already sorted eligible representative", () => {
  const a = { id: "a", provider: "KAYAK sandbox", propertyGroupId: "search:1" } as PublicHotelResult;
  const b = { ...a, id: "b" };
  const c = { ...a, id: "c", propertyGroupId: "search:2" };
  assert.deepEqual(groupHotelOffers([b, c, a]), [[b, a], [c]]);
  assert.deepEqual(groupHotelOffers([a, c]), [[a], [c]]);
});

test("identical names, separate providers and separate snapshots never imply a match", () => {
  const a = { id: "a", name: "Same hotel", provider: "KAYAK sandbox", propertyGroupId: "search:1" } as PublicHotelResult;
  const b = { ...a, id: "b", propertyGroupId: "other-search:1" };
  const c = { ...a, provider: "catalogue" };
  const d = { ...a, id: "d", propertyGroupId: undefined };
  assert.equal(groupHotelOffers([a, b, c, d]).length, 4);
});
