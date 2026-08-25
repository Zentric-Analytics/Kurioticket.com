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

test("authenticated empty Recent uses the travel-history landing state", () => {
  assert.match(screen, /RecentSearchIllustration/);
  assert.match(screen, /testID="recent-search-illustration"/);
  assert.match(screen, />Your next search starts here<\/Text>/);
  assert.match(screen, />Search for flights or hotels and your recent searches will appear here for easy access\.<\/Text>/);
  assert.match(screen, /accessibilityLabel="Start a search"/);
  assert.match(screen, /router\.dismissTo\("\/\(tabs\)"\)/);
  assert.doesNotMatch(screen, /router\.push\("\/\(tabs\)"\)/);
  assert.doesNotMatch(screen, />No recent searches<\/Text>/);
});

test("Recent keeps populated, loading, and signed-out branches intact", () => {
  assert.match(screen, />Recent<\/Text>[\s\S]*>Clear all<\/Text>/);
  assert.match(screen, /recent\.length \?/);
  assert.match(screen, /!recentLoaded \? \(recentLoading && !recentError/);
  assert.match(screen, /FlowIcon name="clock"[\s\S]*>Sign in to view recent searches<\/Text>/);
  assert.match(screen, />Your recent searches are private to your account\.<\/Text>/);
  assert.match(screen, /signInHref\("\/recent"\)/);
});

test("populated Recent uses balanced section spacing without resizing its cards", () => {
  const sectionHeader = screen.match(/sectionHeader: \{([^}]*)\}/)?.[1] ?? "";
  assert.match(sectionHeader, /minHeight: 40/);
  assert.doesNotMatch(sectionHeader, /marginTop:\s*-/);
  assert.doesNotMatch(sectionHeader, /(?:top|translateY):\s*-/);
  assert.doesNotMatch(screen, /sectionHeader: \{ minHeight: 48,/);
  assert.match(screen, /header: \{ minHeight: 76,/);
  assert.match(screen, /populatedHeader: \{ minHeight: 64 \}/);
  assert.match(screen, /const hasPopulatedRecent = authResolved && isAuthenticated && recent\.length > 0/);
  assert.match(screen, /style=\{\[styles\.header, hasPopulatedRecent && styles\.populatedHeader\]\}/);
  assert.match(screen, /recentRow: \{ minHeight: 80,[^}]*marginBottom: 10,/);
  assert.match(screen, /clearTouchTarget: \{ minHeight: 44,/);
  assert.match(screen, /removeTouchTarget: \{ width: 44, height: 44,/);
});

test("populated Recent retains icon, copy, chevron, remove, and navigation structure", () => {
  assert.match(screen, /style=\{\[styles\.iconTile,[\s\S]*style=\{styles\.rowCopy\}[\s\S]*style=\{styles\.rowActions\}><FlowIcon name="chevron"[\s\S]*styles\.removeTouchTarget/);
  assert.match(screen, /onPress=\{\(\) => router\.push\(recentSearchNavigation\(item\)\)\}/);
  assert.match(screen, /event\.stopPropagation\(\); void removeRecent\(item\)/);
  assert.match(screen, /onPress=\{\(\) => void clearRecent\(\)\}/);
});

test("empty Recent measurements and copy remain unchanged", () => {
  assert.match(screen, /const hasPopulatedRecent = authResolved && isAuthenticated && recent\.length > 0/);
  assert.doesNotMatch(screen, /recent\.length === 0 && styles\.populatedHeader/);
  assert.match(screen, /Math\.min\(220, windowWidth - 72\)/);
  assert.match(screen, /height: Math\.min\(198, \(windowWidth - 72\) \* \.9\)/);
  assert.match(screen, /illustrationGap: \{ height: 66 \}/);
  assert.match(screen, /illustrationGapShort: \{ height: 55 \}/);
  assert.match(screen, />Your next search starts here<\/Text>/);
  assert.match(screen, />Search for flights or hotels and your recent searches will appear here for easy access\.<\/Text>/);
  assert.match(screen, /router\.dismissTo\("\/\(tabs\)"\)/);
});
