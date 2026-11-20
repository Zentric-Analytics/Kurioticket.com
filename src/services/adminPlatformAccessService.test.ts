import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parsePlatformAccessQuery, platformAccessHref, PLATFORM_ACCESS_PAGE_SIZE } from "@/lib/adminPlatformAccessQuery";

test("Platform access defaults to Today without a rolling 24-hour window", () => {
  assert.deepEqual(parsePlatformAccessQuery({}), { range: "today", platform: "all", page: 1 });
  assert.equal(PLATFORM_ACCESS_PAGE_SIZE, 20);
});

test("Platform filters reject malformed or repeated inputs", () => {
  for (const input of [
    { range: "24h" }, { platform: "guest" }, { page: "0" },
    { page: "1000000" }, { page: "NaN" }, { range: ["today", "all"] },
  ]) assert.equal(parsePlatformAccessQuery(input), null);
  assert.deepEqual(parsePlatformAccessQuery({ range: "30d", platform: "android", page: "3" }),
    { range: "30d", platform: "android", page: 3 });
});

test("Paging keeps selected platform and date filters", () => {
  assert.equal(platformAccessHref({range:"7d",platform:"ios",page:2}, 3),
    "/admin/users/platforms-devices?range=7d&platform=ios&page=3");
});

test("Platform metrics render before filters on a single standard-desktop strip", () => {
  const page = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
  const metrics = page.indexOf('data-testid="platform-session-metrics"');
  const filters = page.indexOf('<form action="/admin/users/platforms-devices"');
  const history = page.indexOf('aria-labelledby="access-history-heading"');
  assert.ok(metrics > 0 && metrics < filters && filters < history,
    "Page order must be heading, metrics, filters, then session history");
  assert.match(page, /min-\[900px\]:grid-cols-4/);
  assert.match(page, /data-testid="platform-session-metric"/);
  assert.match(page, /result\.counts\.web/);
  assert.match(page, /result\.counts\.ios/);
  assert.match(page, /result\.counts\.android/);
  assert.match(page, /result\.counts\.other/);
  assert.doesNotMatch(page, /<Link href="\/admin\/users" className=\{navigationLink\}>/);
  assert.match(page, /<form action="\/admin\/users\/platforms-devices" method="get"/);
  assert.match(page, /Device &amp; Access History/);
});

test("Overview is admin-only and never returns raw session credentials", () => {
  const service = readFileSync("src/services/adminPlatformAccessService.ts", "utf8");
  const page = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
  assert.match(page, /requireAdminSession\("\/admin\/users\/platforms-devices"\)/);
  assert.match(service, /getOptionalPrisma/);
  assert.match(service, /db\.accountSession\.groupBy/);
  assert.match(service, /groupBy\(\{ by: \["client", "platform"\], where: \{ \.\.\.base, \.\.\.selection \}/);
  assert.match(service, /take: PLATFORM_ACCESS_PAGE_SIZE/);
  assert.match(service, /lastSeenAt: dateFilter/);
  assert.match(service, /const observedAt = new Date\(\)/);
  assert.match(service, /deviceHistoryWindow\(\{ range: query.range, page: 1 \}, observedAt\)/);
  assert.match(service, /db\.accountSession\.count/);
  assert.match(service, /user: \{ select: \{ id: true, name: true, email: true \} \}/);
  assert.match(service, /appVersion: true/);
  assert.match(service, /total !== breakdownTotal/);
  assert.match(service, /Number\.isSafeInteger\(total\)/);
  assert.match(page, /result\.observedAt\.toISOString\(\)/);
  assert.match(page, /AccountSession records/);
  assert.match(page, /not a distinct user, installed device or live visitor/);
  assert.match(page, /AccountSession has no environment field/);
  assert.match(page, /App version not recorded/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*userAgent/);
});
