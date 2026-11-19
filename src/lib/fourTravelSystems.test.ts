import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { authenticatedProfileSections } from "../../apps/mobile/src/features/profile/profileModel";

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

test("mobile exposes travel destinations through its localized profile and Trips tab", () => {
  const items = authenticatedProfileSections.flatMap(section => section.items);
  for (const [label, href] of [["savedItems", "/saved"], ["recentSearches", "/recent"], ["priceAlerts", "/price-alerts"]]) {
    assert.deepEqual(items.find(item => item.label === label)?.destination, { kind: "native", href });
  }
  assert.match(mobileProfile, /authenticatedProfileSections/);
  assert.match(mobileProfile, /accessibilityLabel=\{t\("notifications"\)\}/);
  assert.match(mobileProfile, /router\.push\("\/notifications"\)/);
  assert.match(mobileTrips, /ScreenHeader title="My Trips"/);
  assert.doesNotMatch(`${mobileProfile}\n${mobileTrips}`, /Route Watch|Travel Watchlist|Saved Trips|Add a trip/);
});

test("standalone recent and monitoring routes remain removed", () => {
  for (const path of ["src/app/recent-searches/page.tsx", "src/app/dashboard/recent-searches/page.tsx", "src/app/api/cron/route-watch-updates/route.ts", "src/app/api/cron/saved-trip-reminders/route.ts", "src/app/notifications/page.tsx", "src/app/dashboard/notifications/page.tsx"]) {
    assert.equal(existsSync(path), false);
  }
});
