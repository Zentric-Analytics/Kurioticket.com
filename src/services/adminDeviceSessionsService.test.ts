import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("device history is account-scoped and excludes credentials and network identifiers", () => {
  const source = readFileSync("src/services/adminDeviceSessionsService.ts", "utf8");
  assert.match(source, /where:\s*\{ userId, lastSeenAt: deviceTodayWindow\(\) \}/);
  assert.match(source, /const where = \{ userId, lastSeenAt: deviceHistoryWindow\(query\) \}/);
  assert.match(source, /take:\s*3/);
  assert.match(source, /deviceTodayWindow\(\)/);
  assert.match(source, /loadAdminFullDeviceHistory/);
  assert.match(source, /skip: \(query\.page - 1\) \* DEVICE_HISTORY_PAGE_SIZE/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*userAgent/);
});

test("device details live in dedicated Users pages instead of Activity", () => {
  const activity = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const dedicated = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
  const history = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  assert.doesNotMatch(activity, /<AdminIdentityDeviceAccess/);
  assert.doesNotMatch(activity, /loadAdminDeviceSessions/);
  assert.match(activity, /View account device &amp; access history/);
  assert.match(dedicated, /Platforms &amp; Devices/);
  assert.match(dedicated, /loadPlatformAccess/);
  assert.match(dedicated, /Device &amp; Access History/);
  assert.match(history, /kind !== "user"/);
});

test("presence captures only verified canonical sessions and no raw user agents or IP storage", () => {
  const route = readFileSync("src/lib/onlinePresenceRoute.ts", "utf8");
  const service = readFileSync("src/services/onlinePresenceService.ts", "utf8");
  assert.match(route, /\.\.\.\(account \? \{ device: sessionDeviceObservation\(request, verifiedPlatform\) \} : \{\}\)/);
  assert.match(service, /if \(heartbeat\.accountSessionId && heartbeat\.device\)/);
  assert.match(service, /revokedAt: null/);
  assert.match(service, /expiresAt: \{ gt: heartbeat\.now \}/);
  assert.doesNotMatch(service, /rawIp|userAgent:|tokenHash:/);
});
