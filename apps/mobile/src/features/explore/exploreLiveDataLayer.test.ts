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

test("Explore repository stays cache-first with bundled fallback", () => {
  const repository = source("src/features/explore/exploreCatalogueRepository.ts");
  assert.match(repository, /if \(cached\) return \{ catalogue: cached, source: "cache" \}/);
  assert.match(repository, /catalogue: dependencies\.bundled, source: "bundled"/);
});

test("visible Explore screens consume one shared live catalogue store that refreshes on focus", () => {
  for (const path of [
    "src/features/explore/ExploreScreen.tsx",
    "src/features/explore/ExploreRegionScreen.tsx",
    "src/features/explore/DestinationDetailsScreen.tsx",
  ]) {
    assert.match(source(path), /useExploreCatalogue\(\)/, path);
  }
  const store = source("src/features/explore/exploreCatalogueStore.ts");
  assert.match(store, /let currentCatalogue = bundledExploreCatalogue/);
  assert.match(store, /getExploreCatalogueSnapshot\(\)/);
  assert.match(store, /refreshExploreCatalogue\(\)/);
  assert.match(store, /if \(!refreshPromise\)/);
  assert.match(store, /useFocusEffect/);
  assert.match(store, /startExploreCatalogueSync\(\)/);
});

test("live Explore screens prefer imageDestinationId and retain own-ID media fallback", () => {
  for (const path of [
    "src/features/explore/ExploreScreen.tsx",
    "src/features/explore/ExploreRegionScreen.tsx",
    "src/features/explore/DestinationDetailsScreen.tsx",
  ]) {
    const screen = source(path);
    const remappedLookup = screen.indexOf("destinationMedia(destination.imageDestinationId)");
    const ownIdFallback = screen.indexOf("destinationMedia(destination.id)", remappedLookup);
    assert.ok(remappedLookup >= 0, `${path} must resolve imageDestinationId`);
    assert.ok(ownIdFallback > remappedLookup, `${path} must try imageDestinationId before destination.id fallback`);
  }
});

test("Explore tab renders content directly without an entry loading state", () => {
  const tab = source("app/(tabs)/explore.tsx");
  assert.match(tab, /return <ExploreScreen key=\{visitKey\} \/>/);
  assert.doesNotMatch(tab, /ENTRY_DURATION_MS|Animated|AccessibilityInfo|loadingTitle|showEntry/);
});

test("Explore search resets only when returning from another tab", () => {
  const tab = source("app/(tabs)/explore.tsx");
  assert.match(tab, /navigation\.addListener\("tabPress"/);
  assert.match(tab, /if \(!navigation\.isFocused\(\)\) setVisitKey/);
  assert.doesNotMatch(tab, /useFocusEffect/);
});

test("destination details keeps the protected 360px hero layout", () => {
  const details = source("src/features/explore/DestinationDetailsScreen.tsx");
  assert.match(details, /heroFrame: \{ width: "100%", height: 360, overflow: "hidden"/);
  assert.match(details, /hero: \{ width: "100%", height: 360/);
});
