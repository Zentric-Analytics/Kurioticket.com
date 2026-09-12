import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const verticalStableProps = [
  /alwaysBounceVertical=\{false\}/,
  /bounces=\{false\}/,
  /overScrollMode="never"/,
];
const horizontalStableProps = [
  /alwaysBounceHorizontal=\{false\}/,
  /bounces=\{false\}/,
  /overScrollMode="never"/,
];

function assertStableOwner(source: string, owner: RegExp) {
  const match = source.match(owner);
  assert.ok(match, `Expected vertical scroll owner matching ${owner}`);
  for (const prop of verticalStableProps) assert.match(match[0], prop);
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

test("flight results naturally scroll the date strip while keeping native sticky filters", () => {
  const source = read("src/features/search/ApprovedResultsScreen.tsx");
  const listStart = source.indexOf("<Animated.SectionList");
  const owner = source.slice(listStart, source.indexOf("/>", source.indexOf("windowSize", listStart)) + 2);
  for (const prop of verticalStableProps) assert.match(owner, prop);
  assert.match(source, /if \(status === "loading" \|\| hotelCurrencyPending\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(owner, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(owner, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(owner, /flightPagination|onMomentumScrollEnd|onScrollEndDrag/);
  assert.doesNotMatch(owner, /set[A-Z][A-Za-z]*\(/);
  assert.doesNotMatch(source, /dateHeaderCollapsed|flightDateStripOpacity|flightDateStripHeaderHeight|flightDateStripScrollY/);
  assert.match(source, /const filterRail = \([\s\S]*?<ScrollView\s+horizontal/);
});

test("hotel results use one stable native scroll owner without native Back to top", () => {
  const source = read("src/features/search/ApprovedResultsScreen.tsx");
  const hotelStart = source.indexOf("<HotelResultsHeader destination=");
  const hotelEnd = source.indexOf("<FlightSortSheet", hotelStart);
  const hotelLayout = source.slice(hotelStart, hotelEnd);
  assert.equal(hotelLayout.match(/<SectionList/g)?.length, 1);
  assertStableOwner(hotelLayout, /<SectionList[\s\S]*?ref=\{hotelResultsListRef\}[\s\S]*?alwaysBounceVertical=\{false\}[\s\S]*?>/);
  assert.match(hotelLayout, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(hotelLayout, /hotelCompactHeader|setHotelCompactHeader|hotelIntroBoundary/);
  assert.doesNotMatch(source, /handleHotelScroll|hotelBackToTop|accessibilityLabel="Back to top"/);
});

test("car results keep separate stable vertical and horizontal scroll contracts", () => {
  const source = read("src/features/search/ApprovedCarResultsScreen.tsx");
  const horizontalEnd = source.indexOf("</ScrollView>", source.indexOf("<ScrollView horizontal"));
  const verticalStart = source.indexOf("<ScrollView ref={carScrollRef}", horizontalEnd);
  const verticalOwner = source.slice(verticalStart, source.indexOf(">", verticalStart) + 1);
  const layout = source.slice(source.indexOf("return <SafeAreaView"), source.indexOf("function CarResultsHeader"));
  assert.equal(layout.match(/<ScrollView/g)?.length, 2);
  for (const prop of verticalStableProps) assert.match(verticalOwner, prop);
  assert.doesNotMatch(verticalOwner, /onScroll=|scrollEventThrottle=/);
  assert.doesNotMatch(source, /handleCarScroll|carBackToTop|accessibilityLabel="Back to top"/);
  const horizontalOwner = source.slice(source.indexOf("<ScrollView horizontal"), horizontalEnd);
  for (const prop of horizontalStableProps) assert.match(horizontalOwner, prop);
  assert.doesNotMatch(horizontalOwner, /alwaysBounceVertical=\{false\}/);
});

test("nested explore carousels remain horizontal without vertical stability overrides", () => {
  const source = read("src/features/explore/ExploreScreen.tsx");
  const horizontal = source.match(/<FlatList horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const prop of verticalStableProps) assert.doesNotMatch(horizontal, prop);
});
