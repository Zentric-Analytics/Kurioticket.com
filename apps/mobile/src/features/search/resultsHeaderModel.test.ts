import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DATE_HEADER_COLLAPSE_Y,
  resolveDateHeaderCollapsed,
} from "./resultsHeaderModel";

test("the date header starts expanded and ignores tiny scroll jitter", () => {
  let collapsed = false;
  for (const y of [1, 4, 2, 7, 3, DATE_HEADER_COLLAPSE_Y - 1]) {
    collapsed = resolveDateHeaderCollapsed(y, collapsed);
    assert.equal(collapsed, false);
  }
});

test("meaningful result scrolling collapses the date header", () => {
  assert.equal(resolveDateHeaderCollapsed(DATE_HEADER_COLLAPSE_Y, false), true);
  assert.equal(resolveDateHeaderCollapsed(80, false), true);
});

test("the header remains stable until scrolling back near the top", () => {
  assert.equal(resolveDateHeaderCollapsed(20, true), true);
  assert.equal(resolveDateHeaderCollapsed(9, true), true);
  assert.equal(resolveDateHeaderCollapsed(8, true), false);
  assert.equal(resolveDateHeaderCollapsed(0, true), false);
});

test("flight results wire the collapsing date strip to the result scroll while retaining filters", () => {
  const screen = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
  assert.match(screen, /accessibilityElementsHidden=.*dateHeaderCollapsed/);
  assert.match(screen, /onScroll=\{onResultsScroll\}/);
  assert.match(screen, /scrollEventThrottle=\{16\}/);
  for (const label of ["Filters", "Stops", "Airlines", "Times"]) assert.match(screen, new RegExp(`"${label}"`));
  assert.match(screen, /onSelect=.*router\.setParams/s);
});

test("the flight-results bell opens notifications and refreshes backend unread state on focus", () => {
  const screen = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
  const topBar = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
  const unreadHook = readFileSync(resolve("src/features/notifications/useUnreadNotifications.ts"), "utf8");
  assert.match(screen, /router\.push\("\/notifications"\)/);
  assert.match(topBar, /accessibilityLabel="Notifications"/);
  assert.match(topBar, /hasUnreadNotifications \? <View/);
  assert.match(unreadHook, /useFocusEffect/);
  assert.match(unreadHook, /travelApi\.notificationUnreadCount/);
});
