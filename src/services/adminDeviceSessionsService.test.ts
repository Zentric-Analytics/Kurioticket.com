import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("device history is account-scoped and excludes credentials and network identifiers", () => {
  const source = readFileSync("src/services/adminDeviceSessionsService.ts", "utf8");
  assert.match(source, /where:\s*\{ userId, lastSeenAt: range === "all" \? \{ lte: now \} : deviceTodayWindow\(now, timeZone\) \}/);
  assert.match(source, /const where = \{ userId, lastSeenAt: deviceHistoryWindow\(query, now, timeZone\), \.\.\.accountDevicePlatformWhere\(query.platform\) \}/);
  assert.match(source, /take:\s*1,/);
  assert.match(source, /deviceTodayWindow\(now, timeZone\)/);
  assert.match(source, /loadAdminFullDeviceHistory/);
  assert.match(source, /expiresAt: true, revokedAt: true, revokeReason: true/);
  assert.match(source, /getOnlinePresenceSnapshot\(environment, now\)/);
  assert.match(source, /snapshot\.status === "ok"/);
  assert.match(source, /p\."lastSeenAt" > \$\{cutoff\}/);
  assert.match(source, /s\."id" IN \(\$\{Prisma\.join\(ids\)\}\)/);
  assert.match(source, /LEFT JOIN "OnlinePresenceSession" p/);
  assert.match(source, /BOOL_OR\(p\."accountSessionId" IS NOT NULL\)/);
  assert.match(source, /validSessionIds = verified\.map/);
  assert.match(source, /s\."userId" = \$\{userId\}/);
  assert.match(source, /s\."revokedAt" IS NULL AND s\."expiresAt" > \$\{now\}/);
  assert.match(source, /s\."sessionVersion" = u\."sessionVersion"/);
  assert.match(source, /u\."emailVerified" IS NOT NULL/);
  assert.match(source, /onlineSessionIds = null/);
  assert.match(source, /loadAdminFullDeviceHistory/);
  const historyPage = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  assert.match(historyPage, /recordedDeviceSessionStatus\(session, observedAt, presence\)/);
  assert.match(historyPage, /<VerifiedDeviceStatus/);
  assert.match(historyPage, /status === "Active" \? <span aria-hidden="true"/);
  assert.match(historyPage, /AdminDeviceHistoryAutoRefresh/);
  assert.doesNotMatch(historyPage, />Not expired</);
  assert.match(historyPage, /recordedDeviceSignOutReason\(session\.revokeReason\)/);
  assert.match(historyPage, />Status<\/th>/);
  assert.doesNotMatch(historyPage, /Revoked<\/span>| · Revoked/);
  assert.match(historyPage, /View full history|Device &amp; Access History/);
  assert.match(source, /skip: \(query\.page - 1\) \* DEVICE_HISTORY_PAGE_SIZE/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*userAgent/);
});

test("Activity embeds the latest recorded access with a separate full history", () => {
  const activity = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const preview = readFileSync("src/components/admin/AdminIdentityDeviceAccess.tsx", "utf8");
  const dedicated = readFileSync("src/app/admin/platforms/devices/page.tsx", "utf8");
  const history = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  assert.match(activity, /kind === "user" \? await loadAdminDeviceSessions\(id, timeZone, now, "all"\) : null/);
  assert.match(activity, /<AdminUnifiedActivityList/);
  assert.match(activity, /loadAdminGuestAccessHistory/);
  assert.match(activity, /deviceSessions.sessions\[0\]/);
  assert.match(activity, /guestAccess.records\[0\]/);
  const unified = readFileSync("src/services/adminUnifiedActivityService.ts", "utf8");
  assert.match(unified, /row.guestId !== id/);
  assert.match(unified, /const optional = kind === "guest" && row\.guestSource === "consented"/);
  for (const field of ["deviceLabel", "browser", "os"]) {
    assert.ok(unified.includes("optional ? safeGuestDeviceDescription(row." + field + ', "' + field + '") : null'), field);
  }
  // Location uses the shared source-scoped projection: consented page observations
  // retain their sanitized label, and operational searches expose only their own saved country.
  assert.match(unified, /recordedGuestAccessLocation\(row\) \?\? "Location unavailable"/);
  const observation = readFileSync("src/lib/guestAccessObservation.ts", "utf8");
  assert.match(observation, /row\.guestSource === "consented" && row\.evidence === "page"/);
  assert.match(observation, /safeGuestDeviceDescription\(row\.locationLabel, "locationLabel"\)/);
  assert.match(observation, /row\.guestSource !== "operational" \|\| row\.evidence !== "search"/);
  assert.match(observation, /isIsoCountryCode\(code\)/);
  assert.doesNotMatch(activity, /View account device &amp; access history/);
  assert.doesNotMatch(preview, /<h[123][^>]*>Device &amp; Access History/);
  assert.match(preview, /Today · \{formatAdminTimeZoneLabel\(timeZone\)\}/);
  assert.match(preview, /data-testid="device-today-list"/);
  assert.match(preview, /View full history/);
  assert.match(preview, /kind !== "user"\) return null/);
  assert.match(dedicated, /loadPlatformAccess/);
  assert.match(history, /if \(kind === "guest"\) return <AdminGuestAccessHistory/);
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
