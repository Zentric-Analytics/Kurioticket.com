import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("recent history UI exposes scoped opt-out, per-item removal and Clear all", () => {
  const source = read("./RecentSearches.tsx");
  assert.match(source, /setRememberRecentSearches/);
  assert.match(source, /Remember searches/);
  assert.match(source, /handleRemove\(entry\.id\)/);
  assert.match(source, /handleClearAll/);
  assert.match(source, /deleteBackendRecentSearch\(id\)/);
  assert.match(source, /clearBackendRecentSearches\(\)/);
  assert.match(source, /Recent searches are not being saved on this device/);
});

test("homepage and standalone cars record the same semantic recent-search model", () => {
  assert.match(read("../../app/page.tsx"), /<RecentSearches \/>/);
  assert.match(read("./SearchTabs.tsx"), /const recentSearch = buildCarRecentSearch\(/);
  assert.match(read("./SearchTabs.tsx"), /void syncBackendRecentSearch\(recentSearch\)/);
  assert.match(read("./SearchTabs.tsx"), /buildCarRecentSearch,[\s\S]*from "@\/lib\/recent-searches"/);
  const carsPage = read("../../app/cars/page.tsx");
  assert.match(carsPage, /const recentSearch = buildCarRecentSearch\(/);
  assert.match(carsPage, /void syncBackendRecentSearch\(recentSearch\)/);
});

test("account hydration never deletes device recents as a side effect", () => {
  const results = read("../results/FlightResultsClient.tsx");
  const hydrationEffects = results.slice(
    results.indexOf("const refreshBackendSavedItems"),
    results.indexOf("const closeMobileShortcutMenus"),
  );
  assert.doesNotMatch(hydrationEffects, /removeRecentSearch\(/);
  assert.doesNotMatch(hydrationEffects, /clearRecentSearches\(/);
});
