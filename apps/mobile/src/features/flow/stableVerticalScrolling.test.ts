import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const stableProps = [
  /alwaysBounceVertical=\{false\}/,
  /bounces=\{false\}/,
  /overScrollMode="never"/,
];

function assertStableOwner(source: string, owner: RegExp) {
  const match = source.match(owner);
  assert.ok(match, `Expected vertical scroll owner matching ${owner}`);
  for (const prop of stableProps) assert.match(match[0], prop);
}

test("major vertical screens disable iOS bounce and Android overscroll", () => {
  const screens: [string, RegExp][] = [
    ["src/features/flow/HomeFlowScreen.tsx", /<ScrollView[\s\S]*?style=\{styles\.homeScroll\}[\s\S]*?>/],
    ["src/features/explore/ExploreScreen.tsx", /<FlatList[^>]*data=\{results\}/],
    ["src/features/explore/ExploreScreen.tsx", /<FlatList[^>]*data=\{REGION_DISCOVERY\}/],
    ["src/features/explore/ExploreRegionScreen.tsx", /<FlatList[\s\S]*?data=\{results\}[\s\S]*?>/],
    ["src/features/explore/ExploreRegionScreen.tsx", /<FlatList[\s\S]*?data=\{allDestinations\}[\s\S]*?>/],
    ["src/features/flow/ProductScreens.tsx", /<ScrollView[\s\S]*?contentContainerStyle=\{styles\.page\}[\s\S]*?>/],
    ["src/features/flow/ProductScreens.tsx", /<ScrollView[\s\S]*?contentContainerStyle=\{styles\.hotelPage\}[\s\S]*?>/],
    ["src/features/saved/SavedScreen.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.content\}[^>]*>/],
    ["src/features/recent/RecentSearchesScreen.tsx", /<ScrollView[^>]*contentContainerStyle=\{!recent\.length \? styles\.emptyContent : styles\.content\}[^>]*>/],
    ["src/features/flow/TabScreens.tsx", /<ScrollView[^>]*contentContainerStyle=\{ft\.styles\.scroll\}[^>]*>/],
    ["src/features/profile/ProfileScreen.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.scroll\}[^>]*>/],
    ["src/features/flow/SettingsScreens.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.content\}[^>]*>/],
    ["src/features/notifications/NotificationsScreen.tsx", /<ScrollView[^>]*refreshControl=/],
  ];
  for (const [path, owner] of screens) assertStableOwner(read(path), owner);
});

test("flight results use native sticky filters and an opacity-only animated scroll", () => {
  const source = read("src/features/search/ApprovedResultsScreen.tsx");
  const listStart = source.indexOf("<Animated.SectionList");
  const owner = source.slice(listStart, source.indexOf("/>", source.indexOf("windowSize", listStart)) + 2);
  for (const prop of stableProps) assert.match(owner, prop);
  assert.match(source, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(owner, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(owner, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.match(owner, /onScroll=\{Animated\.event[\s\S]*?useNativeDriver: true/);
  assert.match(source, /<Animated\.View[\s\S]*?style=\{\{ opacity: flightDateStripOpacity \}\}/);
  assert.doesNotMatch(owner, /set[A-Z][A-Za-z]*\(/);
  assert.doesNotMatch(source, /dateHeaderCollapsed|height:\s*flightDateStripOpacity/);
  assert.match(source, /const filterRail = \([\s\S]*?<ScrollView\s+horizontal/);
});

test("hotel results use one stable native scroll owner and threshold-guard Back to top updates", () => {
  const source = read("src/features/search/ApprovedResultsScreen.tsx");
  const start = source.indexOf('<ScrollView ref={hotelScrollRef}');
  const owner = source.slice(start, source.indexOf("</ScrollView>", start) + "</ScrollView>".length);
  for (const prop of stableProps) assert.match(owner, prop);
  assert.equal(owner.match(/<ScrollView ref=\{hotelScrollRef\}/g)?.length, 1);
  assert.match(owner, /stickyHeaderIndices=\{\[0\]\}/);
  assert.match(owner, /hotelFilterSectionHeader[\s\S]*?\{filterRail\}/);
  assert.match(owner, /onScroll=\{handleHotelScroll\}/);
  assert.doesNotMatch(owner, /setHotelCompactHeader|hotelIntroBoundary/);
  assert.match(source, /visible === hotelBackToTopVisibleRef\.current[\s\S]*?return;[\s\S]*?setHotelBackToTop\(visible\)/);
});

test("nested explore carousels remain horizontal without vertical stability overrides", () => {
  const source = read("src/features/explore/ExploreScreen.tsx");
  const horizontal = source.match(/<FlatList horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const prop of stableProps) assert.doesNotMatch(horizontal, prop);
});
