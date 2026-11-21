import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const users = readFileSync("src/app/admin/users/page.tsx", "utf8");
const population = readFileSync("src/services/adminUserPopulationMetrics.ts", "utf8");
const populationCards = readFileSync("src/components/admin/AdminUserPopulationCards.tsx", "utf8");
const platformPage = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
const liveCards = readFileSync("src/components/admin/AdminPlatformOnlinePresence.tsx", "utf8");
const presenceService = readFileSync("src/services/onlinePresenceService.ts", "utf8");

test("population cards precede directory filters but do not reclassify filtered activity as new users", () => {
  assert.ok(users.indexOf("<AdminUserPopulationCards") < users.indexOf("<AdminUsersToolbar"));
  assert.match(users, /readUserPopulationMetrics\(date, environment, now, from, to\)/);
  assert.match(population, /db\.user\.count\(\{ where: \{\} \}\)/);
  assert.match(population, /createdAt: period/);
  assert.match(population, /firstSeenAt: period/);
  assert.match(population, /MIN\("seenAt"\) AS "firstSeenAt"/);
  assert.match(population, /environment' = \$\{environment\}/);
  assert.match(population, /withOptionalDb<UserPopulationMetrics \| null>/);
  assert.match(populationCards, /"Unavailable"/);
  assert.match(populationCards, /do not prove unique people or devices/);
  assert.match(populationCards, /separate from directory search/);
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
});

test("online cards validate live API totals and never approximate online users from historic sessions", () => {
  assert.match(liveCards, /hasVerifiedPlatformCounts\(snapshot\)/);
  assert.match(liveCards, /hasVerifiedPlatformCounts\(next\)/);
  assert.match(liveCards, /fetch\("\/api\/admin\/overview\/online-presence"/);
  assert.match(liveCards, /onlinePresenceHeartbeatMs/);
  assert.match(liveCards, /document\.visibilityState/);
  assert.match(liveCards, /"Unavailable"/);
  assert.match(presenceService, /COUNT\(DISTINCT "registeredUserId"\)/);
  assert.match(presenceService, /"platform" = 'ios'/);
  assert.match(presenceService, /"platform" = 'android'/);
  assert.match(presenceService, /"platform" = 'desktop_web'/);
  assert.match(presenceService, /"platform" = 'mobile_web'/);
  assert.match(presenceService, /platformSum < total/);
});
