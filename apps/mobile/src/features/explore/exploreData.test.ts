import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POPULAR_DESTINATIONS } from "./exploreData";
import { CURATED_POPULAR_DESTINATION_IDS } from "../flow/locationCatalogue";

const mediaSource = () => readFileSync("src/features/explore/destinationMedia.ts", "utf8");

test("popular destinations use the curated 25-item catalogue in maintained order", () => {
  assert.equal(POPULAR_DESTINATIONS.length, 25);
  assert.deepEqual(
    POPULAR_DESTINATIONS.map((item) => item.destination.id),
    CURATED_POPULAR_DESTINATION_IDS,
  );
  assert.equal(new Set(POPULAR_DESTINATIONS.map((item) => item.destination.id)).size, 25);
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
