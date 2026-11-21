import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const users = readFileSync("src/app/admin/users/page.tsx", "utf8");
const population = readFileSync("src/services/adminUserPopulationMetrics.ts", "utf8");
const populationCards = readFileSync("src/components/admin/AdminUserPopulationCards.tsx", "utf8");
const platformPage = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
const liveCards = readFileSync("src/components/admin/AdminPlatformOnlinePresence.tsx", "utf8");
const presenceService = readFileSync("src/services/onlinePresenceService.ts", "utf8");

test("population totals use one consistent and bounded DB read, not journey activity", () => {
  assert.ok(users.indexOf("<AdminUserPopulationCards") < users.indexOf("<AdminUsersToolbar"));
  assert.match(users, /readUserPopulationMetrics\(date, now, from, to\)/);
  assert.match(population, /withOptionalDb<UserPopulationMetrics \| null>/);
  assert.match(population, /db\.\$queryRaw/);
  assert.match(population, /FROM "User"/);
  assert.match(population, /FROM "Visitor" v/);
  assert.match(population, /FROM "VisitorIdentityLink" link/);
  assert.match(population, /"consentStatus" = 'GRANTED'/);
  assert.match(population, /v\."trackingDisabledAt" IS NULL/);
  assert.match(population, /v\."currentUserId" IS NULL/);
  assert.match(population, /"createdAt" >= \$\{bounds.from\}/);
  assert.match(population, /v\."firstSeenAt" >= \$\{bounds.from\}/);
  assert.match(population, /CROSS JOIN/);
  assert.match(population, /newRegistrations > registered \|\| newGuests > guests/);
  assert.doesNotMatch(population, /FROM "SearchHistory"|FROM "RedirectLog"/);
  assert.doesNotMatch(population, /Promise\.all|db\.user\.count|db\.visitor\.count/);
  assert.match(populationCards, /"Unavailable"/);
  assert.doesNotMatch(populationCards, /Registered counts include all account roles|anonymous operational session IDs remain in the directory/);
  assert.match(populationCards, /data-testid="user-population-metric"/);
  assert.match(populationCards, /rounded-lg border border-slate-200 bg-slate-50\/75/);
  assert.match(populationCards, /grid-cols-2 gap-3/);
  assert.doesNotMatch(populationCards, /gap-px overflow-hidden rounded-xl/);
});

test("Platform Health leads the dedicated page and uses measured narrow signals", () => {
  const health = platformPage.indexOf('aria-labelledby="platform-health-heading"');
  const online = platformPage.indexOf("<AdminPlatformOnlinePresence");
  const downloads = platformPage.indexOf('aria-label="Mobile app distribution"');
  const sessions = platformPage.indexOf('data-testid="platform-session-metrics"');
  const filters = platformPage.indexOf('<form action="/admin/users/platforms-devices"');
  const history = platformPage.indexOf('aria-labelledby="access-history-heading"');
  assert.ok(health > 0 && health < online && online < downloads
    && downloads < sessions && sessions < filters && filters < history);
  assert.match(platformPage, /readPlatformOperations\(24, "today"\)/);
  assert.match(platformPage, /getOnlinePresenceSnapshot\(getPublicEnvironment\(\)\)/);
  assert.match(platformPage, /applications\.WEB\.state/);
  assert.match(platformPage, /applications\.IOS\.state/);
  assert.match(platformPage, /applications\.ANDROID\.state/);
  assert.match(platformPage, /"MONITORING_UNAVAILABLE"/);
  assert.match(platformPage, /No verified store-download or install reporting source/);
  assert.match(platformPage, /Account sessions and live presence cannot be used as download counts/);
  assert.match(platformPage, /Device &amp; Access History/);
  assert.match(platformPage, /data-testid="platform-health-metric"/);
  assert.match(platformPage, /data-testid="ios-download-metric"/);
  assert.match(platformPage, /data-testid="android-download-metric"/);
  assert.match(platformPage, /data-testid="platform-session-metric"/);
  assert.match(platformPage, /grid-cols-2 gap-3 min-\[900px\]:grid-cols-4/);
  assert.doesNotMatch(platformPage, /gap-px overflow-hidden rounded-xl/);
});

test("online cards validate live API totals and never approximate online users from historic sessions", () => {
  assert.match(liveCards, /hasVerifiedPlatformCounts\(snapshot\)/);
  assert.match(liveCards, /hasVerifiedPlatformCounts\(next\)/);
  assert.match(liveCards, /fetch\("\/api\/admin\/overview\/online-presence"/);
  assert.match(liveCards, /onlinePresenceHeartbeatMs/);
  assert.match(liveCards, /document\.visibilityState/);
  assert.match(liveCards, /"Unavailable"/);
  assert.match(liveCards, /data-testid="online-platform-metric"/);
  assert.match(liveCards, /grid-cols-2 gap-3/);
  assert.doesNotMatch(liveCards, /gap-px overflow-hidden rounded-xl/);
  assert.match(presenceService, /COUNT\(DISTINCT "registeredUserId"\)/);
  assert.match(presenceService, /"platform" = 'ios'/);
  assert.match(presenceService, /"platform" = 'android'/);
  assert.match(presenceService, /"platform" = 'desktop_web'/);
  assert.match(presenceService, /"platform" = 'mobile_web'/);
  assert.match(presenceService, /platformSum < total/);
});
