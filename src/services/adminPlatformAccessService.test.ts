import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parsePlatformAccessQuery, platformAccessHref, PLATFORM_ACCESS_PAGE_SIZE } from "./adminPlatformAccessService";

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

test("Overview is admin-only and never returns raw session credentials", () => {
  const service = readFileSync("src/services/adminPlatformAccessService.ts", "utf8");
  const page = readFileSync("src/app/admin/users/platforms-devices/page.tsx", "utf8");
  assert.match(page, /requireAdminSession\("\/admin\/users\/platforms-devices"\)/);
  assert.match(service, /getOptionalPrisma/);
  assert.match(service, /db\.accountSession\.groupBy/);
  assert.match(service, /take: PLATFORM_ACCESS_PAGE_SIZE/);
  assert.match(service, /lastSeenAt: dateFilter/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(service, /select:\s*\{[^}]*userAgent/);
  assert.match(page, /not distinct people or installed devices/);
});
