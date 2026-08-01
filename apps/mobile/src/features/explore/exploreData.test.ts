import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { destinationByUnambiguousName } from "./destinationCatalogue";
import { FEATURED_DESTINATIONS, HERO_SLIDES, INTERESTS } from "./exploreData";

const mediaSource = () => readFileSync("src/features/explore/destinationMedia.ts", "utf8");

test("featured and maintained inspiration remain a small curated set", () => {
  assert.equal(FEATURED_DESTINATIONS.length, 4);
  assert.equal(HERO_SLIDES.length, 4);
  assert.equal(INTERESTS.length, 4);
  for (const item of FEATURED_DESTINATIONS) assert.ok(item.destination.id);
});

test("every visible inspiration target resolves to one catalogue destination", () => {
  for (const item of [...HERO_SLIDES, ...INTERESTS]) {
    assert.ok(destinationByUnambiguousName(item.destination), `Unsupported inspiration destination: ${item.destination}`);
  }
});

test("visible interests use the same maintained destination mappings", () => {
  assert.deepEqual(INTERESTS.map((item) => item.name), [
    "Beach escapes",
    "City breaks",
    "Culture and landmarks",
    "City skylines",
  ]);
});

test("known unverified Bali destination asset is not in the destination media manifest", () => {
  assert.doesNotMatch(mediaSource(), /destinations\/bali\.jpg/);
});
