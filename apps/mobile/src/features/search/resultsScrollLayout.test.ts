import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);
const layoutStart = screen.indexOf('<SectionList\n          style={[s0.resultsScroll');
const flightLayout = screen.slice(layoutStart, screen.indexOf(') : (\n        <>', layoutStart));

function styleBlock(name: string, nextName: string) {
  return screen.slice(screen.indexOf(`${name}:`), screen.indexOf(`${nextName}:`, screen.indexOf(`${name}:`)));
}

test("flight results scroll the date strip and price alert into sticky result controls", () => {
  assert.match(flightLayout, /stickySectionHeadersEnabled/);
  assert.match(
    flightLayout,
    /ListHeaderComponent=\{\([\s\S]*?\{dateStrip\}[\s\S]*?<PriceAlert[\s\S]*?renderSectionHeader[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?filterRail : null/,
  );
  const listHeader = flightLayout.slice(flightLayout.indexOf("ListHeaderComponent="), flightLayout.indexOf("renderSectionHeader="));
  const sectionHeader = flightLayout.slice(flightLayout.indexOf("renderSectionHeader="), flightLayout.indexOf("ListEmptyComponent="));
  assert.match(listHeader, /\{dateStrip\}[\s\S]*?<PriceAlert/);
  assert.doesNotMatch(sectionHeader, /dateStrip|PriceAlert/);
  assert.doesNotMatch(flightLayout, /onScroll=|scrollEventThrottle=/);
  assert.doesNotMatch(screen, /dateHeaderCollapsed|dateHeaderProgress|Animated\.timing\(dateHeaderProgress/);
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

test("flight sticky controls use compact, opaque, restrained native depth", () => {
  const stickySurface = styleBlock("stickyFilterSurface", "route");
  const count = styleBlock("flightResultCount", "card");
  const rail = styleBlock("filterRail", "resultsScroll");
  const filters = styleBlock("filters", "modalBackdrop");
  const sectionHeader = flightLayout.slice(
    flightLayout.indexOf("renderSectionHeader"),
    flightLayout.indexOf("ListEmptyComponent"),
  );

  assert.match(sectionHeader, /backgroundColor: theme\.background/);
  assert.match(sectionHeader, /shadowColor: theme\.dark/);
  assert.match(sectionHeader, /shadowOpacity: theme\.dark/);
  assert.match(stickySurface, /zIndex: 2/);
  assert.match(stickySurface, /shadowOffset: \{ width: 0, height: 2 \}/);
  assert.match(stickySurface, /shadowRadius: 3/);
  assert.match(stickySurface, /elevation: 3/);
  assert.doesNotMatch(stickySurface, /border(?:Width|Color)|borderRadius/);
  assert.match(rail, /height: 44/);
  assert.match(filters, /paddingVertical: 3/);
  assert.match(count, /paddingTop: 7/);
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
  assert.match(dateStrip, /flightDate: \{[\s\S]*?height: 50/);
  assert.match(dateStrip, /\{hasPrice \|\| flightResults \? \(/);
  assert.match(dateStrip, /: ""\}/);
  assert.doesNotMatch(dateStrip, /ellipsizeMode="clip"/);
});

test("hotel results retain their non-sticky header and separate result scroll", () => {
  const hotelStart = screen.indexOf(') : (\n        <>', layoutStart);
  const hotelLayout = screen.slice(hotelStart, screen.indexOf("<FlightFilterModal", hotelStart));

  assert.match(hotelLayout, /\{dateStrip\}/);
  assert.match(hotelLayout, /\{filterRail\}/);
  assert.match(hotelLayout, /<ScrollView[^>]*contentContainerStyle=\{s0\.body\}[^>]*>\{resultContent\}<\/ScrollView>/);
  assert.doesNotMatch(hotelLayout, /stickyHeaderIndices|stickySectionHeadersEnabled/);
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
