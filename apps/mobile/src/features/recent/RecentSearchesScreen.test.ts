import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const source = (path: string) => readFileSync(path, "utf8");
const screen = source("src/features/recent/RecentSearchesScreen.tsx");

test("Recent route renders an independent Recent searches screen", () => {
  assert.match(source("app/recent.tsx"), /RecentSearchesScreen/);
  assert.match(screen, />Recent searches<\/Text>/);
  assert.doesNotMatch(screen, /useCanonicalSaved|canonicalSavedCards|destinationMedia|regionBrowseCardLayout|SavedCard|accessibilityRole="tab"/);
  assert.match(screen, /signInHref\("\/recent"\)/);
  assert.match(screen, /Sign in to view recent searches/);
});

test("Recent keeps canonical loading and false-empty protection", () => {
  assert.match(screen, /travelApi\.recentSearches\(\)/);
  assert.match(screen, /!recentLoaded \? \(recentLoading && !recentError/);
  assert.match(screen, /setRecent\(searches\.items\);[\s\S]*setRecentLoaded\(true\)/);
  assert.match(screen, /Unable to synchronize recent searches/);
});

test("Recent keeps local remove and clear behavior", () => {
  assert.match(screen, /travelApi\.deleteRecentSearch\(item\.id\)/);
  assert.match(screen, /setRecent\(\(current\) => current\.filter\(\(row\) => row\.id !== item\.id\)\)/);
  assert.match(screen, /travelApi\.clearRecentSearches\(\);[\s\S]*setRecent\(\[\]\)/);
  assert.match(screen, /event\.stopPropagation\(\); void removeRecent\(item\)/);
  assert.match(screen, /Unable to remove that recent search/);
  assert.match(screen, /Unable to clear recent searches/);
  assert.doesNotMatch(screen, /deleteRecentSearch\(item\.id\)\.then\(loadServer\)/);
});

test("Recent preserves stale-load invalidation and one reconciliation reload", () => {
  assert.match(screen, /recentLoadSequence\.current \+= 1/);
  assert.match(screen, /sequence !== recentLoadSequence\.current \|\| recentMutationCount\.current/);
  assert.match(screen, /activeRecentLoadSequence\.current !== null/);
  assert.match(screen, /reloadRecentAfterMutations\.current = true/);
  assert.match(screen, /!recentMutationCount\.current && reloadRecentAfterMutations\.current/);
  assert.match(screen, /reloadRecentAfterMutations\.current = false;[\s\S]*void loadServer\(\)/);
  assert.match(screen, /recentMutationCount\.current \+= 1/);
  assert.match(screen, /recentMutations\.has\(key\)/);
});

test("Recent navigation stays delegated to the hardened mapper", () => {
  assert.match(screen, /router\.push\(recentSearchNavigation\(item\)\)/);
  assert.doesNotMatch(screen, /item\.href/);
});
