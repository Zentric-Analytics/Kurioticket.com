import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { bundledExploreCatalogue } from "./bundledExploreCatalogue";

const source = (path: string) => readFileSync(path, "utf8");

test("bundled Explore fallback preserves the complete current catalogue", () => {
  assert.equal(bundledExploreCatalogue.regions.length, 8);
  assert.equal(
    bundledExploreCatalogue.regions.reduce((total, region) => total + region.destinations.length, 0),
    235,
  );
  assert.equal(
    new Set(bundledExploreCatalogue.regions.flatMap((region) => region.destinations.map((destination) => destination.id))).size,
    235,
  );
});

test("Explore cache uses bounded native chunks and an atomic manifest pointer", () => {
  const cache = source("src/storage/exploreCatalogueCache.ts");
  assert.match(cache, /MAX_NATIVE_CHUNK_BYTES = 1500/);
  assert.match(cache, /await store\.setItem\(chunkKey\(manifest\.token, index\), chunks\[index\]!\)/);
  assert.match(cache, /await store\.setItem\(MANIFEST_KEY, JSON\.stringify\(manifest\)\)/);
  assert.ok(
    cache.indexOf("await store.setItem(MANIFEST_KEY") > cache.indexOf("await store.setItem(chunkKey(manifest.token, index)"),
    "cache manifest must be committed only after every new chunk is written",
  );
});

test("Explore cache retries when its visible generation changes and cleans failed staging", () => {
  const cache = source("src/storage/exploreCatalogueCache.ts");
  assert.match(cache, /MAX_READ_ATTEMPTS = 2/);
  assert.match(cache, /const latestManifest = await readManifest\(store\)/);
  assert.match(cache, /if \(sameManifest\(manifest, latestManifest\)\) return catalogue/);
  assert.match(cache, /catch \(error\) \{\s*await removeManifestChunks\(store, manifest\);\s*throw error;/s);
});

test("travel API supports both legacy string errors and the standard mobile error envelope", () => {
  const api = source("src/api/travelApi.ts");
  assert.match(api, /typeof data\.error === "string"/);
  assert.match(api, /typeof \(data\.error as Record<string, unknown>\)\.message === "string"/);
  assert.match(api, /return \(data\.error as \{ message: string \}\)\.message/);
});

test("Explore repository is cache-first with bundled fallback and non-blocking live refresh", () => {
  const repository = source("src/features/explore/exploreCatalogueRepository.ts");
  assert.match(repository, /if \(cached\) return \{ catalogue: cached, source: "cache" \}/);
  assert.match(repository, /catalogue: dependencies\.bundled, source: "bundled"/);
  assert.match(repository, /const refresh = refreshExploreCatalogue\(dependencies\)\.catch\(\(\) => null\)/);
});

test("PR 3 does not switch visible Explore screens to the live repository", () => {
  for (const path of [
    "src/features/explore/ExploreScreen.tsx",
    "src/features/explore/ExploreRegionScreen.tsx",
    "src/features/explore/DestinationDetailsScreen.tsx",
  ]) {
    assert.doesNotMatch(source(path), /exploreCatalogueRepository|loadExploreCatalogue|refreshExploreCatalogue/);
  }
});
