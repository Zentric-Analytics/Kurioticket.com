import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/flow/TabScreens.tsx", "utf8");
const tabBar = readFileSync("src/features/tabs/KurioticketTabBar.tsx", "utf8");
const layout = readFileSync("app/(tabs)/_layout.tsx", "utf8");
const api = readFileSync("src/api/travelApi.ts", "utf8");

test("mobile reservation navigation consistently uses My Trips", () => {
  assert.match(screen, /ScreenHeader title="My Trips"/);
  assert.match(tabBar, /trips: "My Trips"/);
  assert.match(layout, /title: "My Trips"/);
  assert.match(layout, /tabBarAccessibilityLabel: "My Trips"/);
});

test("My Trips exposes upcoming, past, and cancelled TripBooking states", () => {
  for (const state of ["upcoming", "past", "cancelled"]) {
    assert.match(screen, new RegExp(`value: "${state}"`));
    assert.match(api, new RegExp(`"${state}"`));
  }
  assert.match(screen, /travelApi\s*\.trips\(tab\)/);
  assert.match(screen, /provider-backed bookings will appear here/);
});

test("My Trips has no planning or add-trip mutation", () => {
  assert.doesNotMatch(screen, /Add a trip|explore-trip|FlowIcon name="plus"/);
  assert.doesNotMatch(api, /createTrip|saveTrip|POST.*trips/);
});
