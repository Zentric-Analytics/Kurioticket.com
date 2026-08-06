import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { destinationById } from "./destinationCatalogue";
import { POPULAR_DESTINATIONS, INTERESTS } from "./exploreData";
import { CURATED_POPULAR_DESTINATION_IDS } from "../flow/locationCatalogue";

const mediaSource = () => readFileSync("src/features/explore/destinationMedia.ts", "utf8");

test("popular destinations use the curated 25-item catalogue in maintained order", () => {
  assert.equal(POPULAR_DESTINATIONS.length, 25);
  assert.equal(INTERESTS.length, 4);
  assert.deepEqual(
    POPULAR_DESTINATIONS.map((item) => item.destination.id),
    CURATED_POPULAR_DESTINATION_IDS,
  );
  assert.equal(new Set(POPULAR_DESTINATIONS.map((item) => item.destination.id)).size, 25);
});

test("every visible interest resolves to one catalogue destination", () => {
  for (const item of INTERESTS) {
    assert.ok(destinationById.get(item.destinationId), `Unsupported interest destination: ${item.destinationId}`);
  }
});

test("visible interests use the same maintained destination mappings", () => {
  assert.deepEqual(
    INTERESTS.map(({ name, destinationId }) => [name, destinationId]),
    [
      ["Beach escapes", "id-bali"],
      ["City breaks", "fr-paris"],
      ["Culture and landmarks", "gb-london"],
      ["City skylines", "us-new-york"],
    ],
  );
});

test("approved Bali destination asset is registered in the destination media manifest", () => {
  assert.match(mediaSource(), /destinations\/bali\.jpg/);
});

test("destination hero media remains local-first, website-curated, then fallback", () => {
  const source = mediaSource();
  assert.ok(source.indexOf("explicitMediaById.get") < source.indexOf("curatedDestinationImage(destinationId)"));
  assert.ok(source.indexOf("curatedDestinationImage(destinationId)") < source.indexOf("source: FALLBACK_SOURCE"));
  assert.match(source, /failed \? FALLBACK_SOURCE/);
});
