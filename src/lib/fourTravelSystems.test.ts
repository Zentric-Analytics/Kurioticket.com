import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
const systems = ["My Trips", "Saved & Recent", "Price Alerts", "Notifications"];
test("web and mobile expose the same four canonical travel systems", () => {
  const web = readFileSync("src/lib/i18n/en.ts", "utf8");
  const mobile = readFileSync("apps/mobile/src/features/profile/ProfileScreen.tsx", "utf8");
  for (const system of systems) { assert.match(web, new RegExp(system.replace("&", "&"))); assert.match(mobile, new RegExp(system.replace("&", "&"))); }
  assert.doesNotMatch(mobile, /Route Watch|Saved Trips/);
});
test("standalone recent and monitoring routes are removed", () => {
  for (const path of ["src/app/recent-searches/page.tsx", "src/app/dashboard/recent-searches/page.tsx", "src/app/api/cron/route-watch-updates/route.ts", "src/app/api/cron/saved-trip-reminders/route.ts"]) assert.equal(existsSync(path), false);
});
