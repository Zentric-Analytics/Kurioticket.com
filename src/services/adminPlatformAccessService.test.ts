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
    "/admin/platforms/devices?range=7d&platform=ios&page=3");
});

test("Platform metrics stay before filters with no duplicate global device history", () => {
  const page = readFileSync("src/app/admin/platforms/devices/page.tsx", "utf8");
  const metrics = page.indexOf('data-testid="platform-session-metrics"');
  const filters = page.indexOf('<form action="/admin/platforms/devices"');
  assert.ok(metrics > 0 && metrics < filters, "Platform counts precede time/platform filters");
  assert.match(page, /min-\[900px\]:grid-cols-4/);
  assert.match(page, /data-testid="platform-session-metric"/);
  assert.match(page, /result\.counts\.web/);
  assert.match(page, /result\.counts\.ios/);
  assert.match(page, /result\.counts\.android/);
  assert.match(page, /result\.counts\.other/);
  assert.match(page, /<form action="\/admin\/platforms\/devices" method="get"/);
  assert.doesNotMatch(page, /access-history-heading|Device &amp; Access History|Platform access pagination|result\.sessions|<table/);
});

test("Platform monitoring uses bounded aggregate counts, not account history rows or credentials", () => {
  const service = readFileSync("src/services/adminPlatformAccessService.ts", "utf8");
  const page = readFileSync("src/app/admin/platforms/devices/page.tsx", "utf8");
  assert.match(page, /requireAdminSession\("\/admin\/platforms\/devices"\)/);
  assert.match(service, /getOptionalPrisma/);
  assert.match(service, /db\.accountSession\.groupBy/);
  assert.match(service, /groupBy\(\{ by: \["client", "platform"\], where: \{ \.\.\.base, \.\.\.selection \}/);
  assert.match(service, /db\.accountSession\.count/);
  assert.match(service, /lastSeenAt: dateFilter/);
  assert.match(service, /const observedAt = new Date\(\)/);
  assert.match(service, /deviceHistoryWindow\(\{ range: query.range, page: 1 \}, observedAt\)/);
  assert.match(service, /total !== breakdownTotal/);
  assert.match(service, /Number\.isSafeInteger\(total\)/);
  assert.doesNotMatch(service, /db\.accountSession\.findMany|tokenHash|maskedIp|userAgent/);
  assert.doesNotMatch(page, /platformLabel|deviceValue|userId|AccountSession records/);
});
