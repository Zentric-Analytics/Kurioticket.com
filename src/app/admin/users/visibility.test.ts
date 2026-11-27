import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const users = readFileSync("src/app/admin/users/page.tsx", "utf8");
const db = readFileSync("src/lib/prisma.ts", "utf8");
const alerts = readFileSync("src/components/admin/ConfirmedTripDeliveryAlerts.tsx", "utf8");

test("Users distinguishes database-read failures from truly empty account and guest directories", () => {
  assert.match(users, /withOptionalDb<DirectoryResult \| null>/);
  assert.match(users, /isolationLevel: "RepeatableRead" \}\), null\);/);
  assert.doesNotMatch(users, /\}, \{ rows: \[\] as IdentityRow\[\], registeredCount: 0, guestCount: 0 \}\);/);
  assert.match(users, /if \(result === null\) \{/);
  assert.match(users, /role="status" aria-label="Users directory unavailable"/);
  assert.match(users, /User and guest counts and records are unavailable/);
  assert.match(users, /Retry directory/);
  assert.match(users, /href=\{link\}/);
  assert.match(users, /<AdminUsersToolbar timeZone=\{timeZone\} now=\{now\.toISOString\(\)\} query=\{q\} role=\{role\} status=\{status\} tab=\{tab\}/);
  // Location is optional enrichment of the successful directory result.
  // A database failure must still render the explicit unavailable state.
  assert.ok(users.indexOf("if (result === null) {") < users.indexOf("const guestLocations = await loadAdminGuestRecordedLocations("));
  assert.match(users, /const rowsWithLocations = result\.rows\.map\(row => row\.kind === "guest" \? \{/);
  assert.match(users, /\.\.\.row, lastRecordedLocation: guestLocations\.get\(guestRecordedLocationKey\(row\.record\.id,\s*row\.guestSource === "operational" \? "operational" : "consented"\)\) \?\? null,\s*\} : row\);/);
  assert.match(users, /<AdminIdentityTable rows=\{rowsWithLocations\}/);
  const locations = readFileSync("src/services/adminGuestRecordedLocationsService.ts", "utf8");
  assert.match(locations, /return withOptionalDb\(async db => \{/);
  assert.match(locations, /\}, new Map<string, RecordedGuestLocation>\(\)\);/);
  assert.match(db, /catch \(error\) \{[\s\S]*?return fallback/);
});

test("Unacknowledged critical confirmation alerts open by default while all alerts stay in the authorized disclosure", () => {
  assert.match(alerts, /const hasUnacknowledgedCritical = alerts\.some\(\(alert\) => alert\.severity === "CRITICAL" && !alert\.acknowledged\)/);
  assert.match(alerts, /<details open=\{hasUnacknowledgedCritical\}/);
  assert.match(alerts, /if \(alerts\.length === 0\) return null;/);
  assert.match(alerts, /alerts\.map\(\(alert\) =>/);
  assert.match(alerts, /requireAdminSession/);
  assert.match(alerts, /isProtectedAdminEmail/);
});
