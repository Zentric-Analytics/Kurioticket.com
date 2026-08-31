import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);
const layoutStart = screen.indexOf('<Animated.SectionList\n          style={[s0.resultsScroll');
const flightLayout = screen.slice(layoutStart, screen.indexOf(') : (\n        <>', layoutStart));

function styleBlock(name: string, nextName: string) {
  return screen.slice(screen.indexOf(`${name}:`), screen.indexOf(`${nextName}:`, screen.indexOf(`${name}:`)));
}

test("flight results put fading dates before a native sticky filter rail", () => {
  const beforeList = screen.slice(screen.indexOf("<FlightResultsHeader"), layoutStart);
  const listHeader = flightLayout.slice(flightLayout.indexOf("ListHeaderComponent="), flightLayout.indexOf("renderItem="));
  const renderItem = flightLayout.slice(flightLayout.indexOf("renderItem="), flightLayout.indexOf("ListEmptyComponent="));
  assert.doesNotMatch(beforeList, /flightPersistentSearchControls|\{filterRail\}/);
  assert.match(listHeader, /ListHeaderComponent=\{status === "loading" \? \([\s\S]*?<FlightLoadingExperience[\s\S]*?\) : animatedFlightDateStrip\}/);
  assert.match(listHeader, /renderSectionHeader[\s\S]*?backgroundColor: theme\.background[\s\S]*?\{filterRail\}/);
  assert.match(listHeader, /stickySectionHeadersEnabled/);
  assert.ok(listHeader.indexOf("ListHeaderComponent=") < listHeader.indexOf("renderSectionHeader="));
  assert.match(renderItem, /<PriceAlert[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?<FlightCard/);
  assert.match(flightLayout, /initialNumToRender=\{6\}[\s\S]*?maxToRenderPerBatch=\{5\}[\s\S]*?updateCellsBatchingPeriod=\{50\}[\s\S]*?windowSize=\{7\}/);
  assert.match(readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8"), /numberOfLines=\{1\}[\s\S]*?nearbyDateInsightText[\s\S]*?Cheaper nearby:/);
  assert.doesNotMatch(flightLayout, /dateHeaderCollapsed|position:\s*"absolute"/);
});

test("date and filter rails retain their horizontal interactions", () => {
  const dateStrip = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");

  assert.match(dateStrip, /export function DateStrip[\s\S]*?<ScrollView\s+horizontal/);
  assert.match(dateStrip, /onPress=\{\(\) => onSelect\(iso\)\}/);
  assert.match(screen, /const filterRail = \([\s\S]*?<ScrollView\s+horizontal[\s\S]*?openFlightFilters\("all"\)/);
  assert.match(screen, /label=\{flightSortQuickLabel\(sort\)\}/);
  for (const label of ["Filter", "Airlines", "Stops"]) {
    assert.match(screen, new RegExp(`"${label}"`));
  }
});

test("persistent flight controls and scrolling count keep compact spacing", () => {
  const count = styleBlock("flightResultCount", "card");
  const rail = styleBlock("filterRail", "resultsScroll");
  const filters = styleBlock("filters", "modalBackdrop");
  assert.match(rail, /height: 44/);
  assert.match(filters, /paddingHorizontal: 14/);
  assert.match(filters, /paddingVertical: 3/);
  assert.match(filters, /gap: 8/);
  assert.match(count, /paddingTop: 4/);
  assert.doesNotMatch(screen, /stickyFilterSurface|flightPersistentSearchControls/);
});

test("the compact rail remains structurally safe at supported phone widths", () => {
  const filterRail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));

  assert.match(filterRail, /<ScrollView\s+horizontal/);
  assert.match(filterRail, /showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(filterRail, /flexWrap|numColumns|width:\s*(?:320|360|375|390|412|430)/);
  assert.match(styleBlock("filters", "modalBackdrop"), /paddingHorizontal: 14/);
});

test("flight dates use full resolved fares in wider, single-line tiles", () => {
  const dateStrip = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");

  assert.match(screen, /flightDisplayPrices\.get\(result\.id\)/);
  assert.match(screen, /date: departureDate,[\s\S]*?formatted: displayed\.formatted,[\s\S]*?accessibilityLabel: displayed\.formatted/);
  assert.match(dateStrip, /const price = priceByDate\[iso\]/);
  assert.doesNotMatch(screen, /formatDateStripPrice/);
  assert.match(dateStrip, /flightResults && s\.flightDate/);
  assert.match(dateStrip, /flightDate: \{[\s\S]*?minWidth: 76,[\s\S]*?maxWidth: 96/);
  assert.match(dateStrip, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit/);
  assert.match(dateStrip, /flightDate: \{[\s\S]*?height: 76/);
  assert.match(dateStrip, /\{hasPrice \|\| flightResults \? \(/);
  assert.match(dateStrip, /: "—"\}/);
  assert.doesNotMatch(dateStrip, /ellipsizeMode="clip"/);
});

test("hotel results omit the date rail and keep filters above the separate result scroll", () => {
  const hotelStart = screen.indexOf(') : (\n        <>', layoutStart);
  const hotelLayout = screen.slice(hotelStart, screen.indexOf("<FlightSortModal", hotelStart));

  assert.doesNotMatch(hotelLayout, /DateStrip|dateStrip|flightDateStrip/);
  assert.match(hotelLayout, /\{filterRail\}/);
  assert.match(hotelLayout, /<ScrollView[^>]*contentContainerStyle=\{s0\.body\}[^>]*>\{resultContent\}<\/ScrollView>/);
  assert.ok(hotelLayout.indexOf("{filterRail}") < hotelLayout.indexOf("<ScrollView"));
  assert.doesNotMatch(hotelLayout, /stickyHeaderIndices|stickySectionHeadersEnabled/);
  assert.doesNotMatch(hotelLayout, /<View[^>]*>\s*<\/View>|dateStripWrapper/);
});

test("the results date rail remains Flight-only and updates departure date", () => {
  const flightDateStrip = screen.slice(
    screen.indexOf("const flightDateStrip ="),
    screen.indexOf("const flightDateStripOpacity"),
  );

  assert.match(flightDateStrip, /<DateStrip/);
  assert.match(flightDateStrip, /date=\{flightDate\}/);
  assert.match(flightDateStrip, /onSelect=\{\(v\) => router\.setParams\(\{ departureDate: v \}\)\}/);
  assert.doesNotMatch(flightDateStrip, /checkIn/);
  assert.match(screen, /const animatedFlightDateStrip = \([\s\S]*?\{flightDateStrip\}/);
});

test("Flight Results removes bell work without changing the shared notification implementation", () => {
  const topBar = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
  const unreadHook = readFileSync(
    resolve("src/features/notifications/useUnreadNotifications.ts"),
    "utf8",
  );

  assert.doesNotMatch(screen, /router\.push\("\/notifications"\)|useUnreadNotifications/);
  assert.match(topBar, /accessibilityLabel="Notifications"/);
  assert.match(topBar, /hasUnreadNotifications \? <View/);
  assert.match(unreadHook, /useFocusEffect/);
  assert.match(unreadHook, /travelApi\.notificationUnreadCount/);
});
