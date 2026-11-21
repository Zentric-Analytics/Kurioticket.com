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
  assert.match(source, /expiresAt: true, revokedAt: true, revokeReason: true/);
  assert.match(source, /loadAdminFullDeviceHistory/);
  const historyPage = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  assert.match(historyPage, /recordedDeviceSessionStatus\\(session, observedAt\\)/);
  assert.match(historyPage, /recordedDeviceSignOutReason\\(session\\.revokeReason\\)/);
  assert.match(historyPage, />Status<\\/th>/);
  assert.doesNotMatch(historyPage, /Revoked<\\/span>| · Revoked/);
  assert.match(historyPage, /View full history|Device &amp; Access History/);
  assert.match(source, /skip: \(query\.page - 1\) \* DEVICE_HISTORY_PAGE_SIZE/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*userAgent/);
});

test("registered Activity embeds a heading-free Today preview with a separate full history", () => {
  const activity = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const preview = readFileSync("src/components/admin/AdminIdentityDeviceAccess.tsx", "utf8");
  const dedicated = readFileSync("src/app/admin/platforms/devices/page.tsx", "utf8");
  const history = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  assert.match(activity, /kind === "user" \? await loadAdminDeviceSessions\(id\) : null/);
  assert.match(activity, /<AdminIdentityDeviceAccess/);
  assert.doesNotMatch(activity, /View account device &amp; access history/);
  assert.doesNotMatch(preview, /<h[123][^>]*>Device &amp; Access History/);
  assert.match(preview, /Today \(UTC\)/);
  assert.match(preview, /data-testid="device-today-list"/);
  assert.match(preview, /View full history/);
  assert.match(preview, /kind !== "user"\) return null/);
  assert.match(dedicated, /loadPlatformAccess/);
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
