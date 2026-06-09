import test from "node:test";
import assert from "node:assert/strict";

import {
  getHomeDiscoveryFareCandidates,
  getHomeDiscoveryByRegion,
} from "@/data/homeDiscovery";

test("US homepage discovery does not show Africa-specific route set", () => {
  const cards = getHomeDiscoveryByRegion("US").slice(0, 16);
  const candidates = getHomeDiscoveryFareCandidates("US");

  assert.ok(cards.length > 0);
  assert.ok(cards.every((item) => item.id.startsWith("us-")));
  assert.ok(candidates.every((item) => item.regionCode === "US"));
  assert.ok(candidates.every((item) => !/^(ng|ke|za)-/.test(item.id)));
});

test("Africa homepage discovery still shows Africa-relevant route set", () => {
  const cards = getHomeDiscoveryByRegion("NG").slice(0, 16);
  const candidates = getHomeDiscoveryFareCandidates("AFRICA");

  assert.ok(cards.length > 0);
  assert.ok(cards.some((item) => item.originCode === "LOS" || item.originCode === "ABV"));
  assert.ok(candidates.length > 0);
  assert.ok(candidates.some((item) => item.regionCode === "AFRICA"));
});
