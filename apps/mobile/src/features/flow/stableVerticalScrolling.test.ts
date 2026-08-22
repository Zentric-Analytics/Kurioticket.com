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
    ["src/features/saved/SavedRecentScreen.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.content\}[^>]*>/],
    ["src/features/flow/TabScreens.tsx", /<ScrollView[^>]*contentContainerStyle=\{ft\.styles\.scroll\}[^>]*>/],
    ["src/features/profile/ProfileScreen.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.scroll\}[^>]*>/],
    ["src/features/flow/SettingsScreens.tsx", /<ScrollView[^>]*contentContainerStyle=\{styles\.content\}[^>]*>/],
    ["src/features/notifications/NotificationsScreen.tsx", /<ScrollView[^>]*refreshControl=/],
  ];
  for (const [path, owner] of screens) assertStableOwner(read(path), owner);
});

test("flight results keep fixed chrome, sticky filters, and stable outer scrolling", () => {
  const source = read("src/features/search/ApprovedResultsScreen.tsx");
  assertStableOwner(source, /<ScrollView[\s\S]*?style=\{\[s0\.resultsScroll[\s\S]*?>/);
  assert.match(source, /stickyHeaderIndices=\{\[1\]\}/);
  assert.match(source, /<\/ScrollView>[\s\S]*?<BottomNav flightResults=\{flightResults\} \/>/);
  assert.match(source, /const filterRail = \([\s\S]*?<ScrollView\s+horizontal/);
});

test("nested explore carousels remain horizontal without vertical stability overrides", () => {
  const source = read("src/features/explore/ExploreScreen.tsx");
  const horizontal = source.match(/<FlatList horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const prop of stableProps) assert.doesNotMatch(horizontal, prop);
});
