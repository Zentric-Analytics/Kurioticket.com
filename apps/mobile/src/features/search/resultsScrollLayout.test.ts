import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);
const layoutStart = screen.indexOf('<ScrollView\n          style={[s0.resultsScroll');
const flightLayout = screen.slice(layoutStart, screen.indexOf(') : (\n        <>', layoutStart));

test("flight results naturally scroll the date strip into a sticky filter rail", () => {
  assert.match(flightLayout, /stickyHeaderIndices=\{\[1\]\}/);
  assert.match(
    flightLayout,
    /<View>\{dateStrip\}<\/View>[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?filterRail : null[\s\S]*?<View style=\{\[s0\.body, s0\.flightResultsBody\]\}>\{resultContent\}<\/View>/,
  );
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
  assert.doesNotMatch(hotelLayout, /stickyHeaderIndices/);
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
