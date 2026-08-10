import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const sql = readFileSync("prisma/migrations/20260810000000_unify_four_travel_systems/migration.sql", "utf8");
test("legacy notification values are rewritten before enum replacement", () => {
  const route = sql.indexOf(`WHERE "type" = 'ROUTE_WATCH'`);
  const reminder = sql.indexOf(`WHERE "type" = 'TRIP_REMINDER'`);
  const replacement = sql.indexOf(`ALTER TYPE "NotificationType" RENAME`);
  assert.ok(route > 0 && reminder > route && replacement > reminder);
  assert.match(sql, /UPDATE "Notification" SET "type" = 'TRAVEL_INSIGHT'/);
});
test("price email consent is the union of legacy price-monitoring consent only", () => {
  assert.match(sql, /priceAlerts'[\s\S]+OR[\s\S]+routeWatchUpdates/);
  assert.doesNotMatch(sql, /jsonb_build_object\('priceAlerts'[\s\S]+savedTripReminders/);
});
test("legacy tables are copied before they are dropped", () => {
  for (const table of ["TravelWatchlist", "SavedTrip", "RouteWatchState"]) assert.ok(sql.indexOf(`FROM "${table}"`) < sql.indexOf(`DROP TABLE "${table}"`));
});
