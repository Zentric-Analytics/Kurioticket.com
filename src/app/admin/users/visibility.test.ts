import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const users = readFileSync("src/app/admin/users/page.tsx", "utf8");
const db = readFileSync("src/lib/prisma.ts", "utf8");
const alerts = readFileSync("src/components/admin/ConfirmedTripDeliveryAlerts.tsx", "utf8");

test("Users distinguishes database-read failures from truly empty account and guest directories", () => {
  assert.match(users, /withOptionalDb<\{ rows: IdentityRow\[\]; registeredCount: number; guestCount: number; operationalAllTimeCount: number \| null; operationalNewCount: number \| null \} \| null>/);
  assert.match(users, /\}, null\);/);
  assert.doesNotMatch(users, /\}, \{ rows: \[\] as IdentityRow\[\], registeredCount: 0, guestCount: 0 \}\);/);
  assert.match(users, /if \(result === null\) \{/);
  assert.match(users, /role="status" aria-label="Users directory unavailable"/);
  assert.match(users, /User and guest counts and records are unavailable/);
  assert.match(users, /Retry directory/);
  assert.match(users, /href=\{link\}/);
  assert.match(users, /<AdminUsersToolbar query=\{q\} role=\{role\} status=\{status\} tab=\{tab\}/);
  assert.match(users, /<AdminIdentityTable rows=\{result\.rows\}/);
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
