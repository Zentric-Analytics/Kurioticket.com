import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);
const flightLayout = screen.slice(
  screen.indexOf('{product === "flight" ? ('),
  screen.indexOf(') : (\n        <>', screen.indexOf('{product === "flight" ? (')),
);

test("flight results naturally scroll the date strip into a sticky filter rail", () => {
  assert.match(flightLayout, /stickyHeaderIndices=\{\[1\]\}/);
  assert.match(
    flightLayout,
    /<View>\{dateStrip\}<\/View>[\s\S]*?<View style=\{s0\.stickyFilterSurface\}>\{filterRail\}<\/View>[\s\S]*?<View style=\{s0\.body\}>\{resultContent\}<\/View>/,
  );
  assert.doesNotMatch(flightLayout, /onScroll=|scrollEventThrottle=/);
  assert.doesNotMatch(screen, /dateHeaderCollapsed|dateHeaderProgress|Animated\.timing\(dateHeaderProgress/);
});

test("date and filter rails retain their horizontal interactions", () => {
  const dateStrip = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");

  assert.match(dateStrip, /export function DateStrip[\s\S]*?<ScrollView\s+horizontal/);
  assert.match(dateStrip, /onPress=\{\(\) => onSelect\(iso\)\}/);
  assert.match(screen, /const filterRail = \([\s\S]*?<ScrollView\s+horizontal[\s\S]*?openFlightFilters\("all"\)/);
  for (const label of ["Filters", "Stops", "Airlines", "Times"]) {
    assert.match(screen, new RegExp(`"${label}"`));
  }
});

test("hotel results retain their non-sticky header and separate result scroll", () => {
  const hotelLayout = screen.slice(
    screen.indexOf(') : (\n        <>', screen.indexOf('{product === "flight" ? (')),
    screen.indexOf("<FlightFilterModal", screen.indexOf(') : (\n        <>')),
  );

  assert.match(hotelLayout, /\{dateStrip\}/);
  assert.match(hotelLayout, /\{filterRail\}/);
  assert.match(hotelLayout, /<ScrollView contentContainerStyle=\{s0\.body\}>\{resultContent\}<\/ScrollView>/);
  assert.doesNotMatch(hotelLayout, /stickyHeaderIndices/);
});

test("the flight-results bell opens notifications and refreshes unread state on focus", () => {
  const topBar = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
  const unreadHook = readFileSync(
    resolve("src/features/notifications/useUnreadNotifications.ts"),
    "utf8",
  );

  assert.match(screen, /router\.push\("\/notifications"\)/);
  assert.match(topBar, /accessibilityLabel="Notifications"/);
  assert.match(topBar, /hasUnreadNotifications \? <View/);
  assert.match(unreadHook, /useFocusEffect/);
  assert.match(unreadHook, /travelApi\.notificationUnreadCount/);
});
