import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
const header = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
const mobileProfile = readFileSync("apps/mobile/src/features/profile/ProfileScreen.tsx", "utf8");
const mobileTrips = readFileSync("apps/mobile/src/features/flow/TabScreens.tsx", "utf8");

test("web exposes only its three canonical travel destinations", () => {
  for (const key of ["accountDashboard.hub.myTrips", "accountDashboard.hub.savedRecent", "accountDashboard.hub.priceAlerts"]) {
    assert.match(dashboard, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(dashboard, /accountDashboard\.hub\.notifications|href: "\/notifications"/);
  assert.doesNotMatch(header, /accountMenu\.notifications|href: "\/notifications"/);
});

test("mobile exposes all four canonical travel systems", () => {
  for (const system of ["My Trips", "Saved & Recent", "Price Alerts", "Notifications"]) {
    assert.match(mobileProfile, new RegExp(system.replace("&", "&")));
  }
  assert.match(mobileTrips, /ScreenHeader title="My Trips"/);
  assert.doesNotMatch(`${mobileProfile}\n${mobileTrips}`, /Route Watch|Travel Watchlist|Saved Trips|Add a trip/);
});

test("standalone recent and monitoring routes remain removed", () => {
  for (const path of ["src/app/recent-searches/page.tsx", "src/app/dashboard/recent-searches/page.tsx", "src/app/api/cron/route-watch-updates/route.ts", "src/app/api/cron/saved-trip-reminders/route.ts", "src/app/notifications/page.tsx", "src/app/dashboard/notifications/page.tsx"]) {
    assert.equal(existsSync(path), false);
  }
});
