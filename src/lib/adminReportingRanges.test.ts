import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { partitionOperationalGroups } from "@/services/platformOperationsContract";
import {
  ADMIN_DEFAULT_REPORTING_RANGE,
  ADMIN_REPORTING_RANGE_OPTIONS,
  ADMIN_REPORTING_RANGE_LABELS,
  adminCustomDateRange,
  adminRollingRange,
} from "./adminReportingRanges";
import { resolveOverviewRange } from "./adminOverviewRange";
import { adminIdentityDateBounds, parseAdminIdentityDate } from "./adminIdentityDirectory";
import { resolveHandoffDateRange } from "./adminHandoffDateRange";

const now = new Date("2026-11-19T12:00:00.000Z");
test("Admin reporting menu has exactly five standard options in the required order", () => {
  assert.equal(ADMIN_DEFAULT_REPORTING_RANGE, "today");
  assert.deepEqual(ADMIN_REPORTING_RANGE_OPTIONS.map(item => item.label), [
    "Today", "Last 7 days", "Last 30 days", "All time", "Custom range",
  ]);
  assert.equal(ADMIN_REPORTING_RANGE_LABELS.today, "Today");
  assert.equal(ADMIN_REPORTING_RANGE_LABELS["24h"], "Last 24 hrs");
  assert.deepEqual(adminRollingRange("today", now), { from: "2026-11-19T00:00:00.000Z", to: now.toISOString() });
  assert.deepEqual(adminRollingRange("24h", now), {
    from: "2026-11-18T12:00:00.000Z", to: now.toISOString(),
  });
  assert.equal(adminRollingRange("7d", now).from, "2026-11-12T12:00:00.000Z");
  assert.equal(adminRollingRange("30d", now).from, "2026-10-20T12:00:00.000Z");
});

test("Overview Today includes November 25 searches made before UTC midnight in Nigeria", () => {
  const beforeMidnightUtc = new Date("2026-11-24T23:45:00Z");
  const firstSearch = new Date("2026-11-24T23:01:00Z");
  const lagos = resolveOverviewRange(undefined, beforeMidnightUtc, "Africa/Lagos");
  assert.equal(lagos.today, "2026-11-25");
  assert.equal(lagos.from.toISOString(), "2026-11-24T23:00:00.000Z");
  assert.ok(lagos.from <= firstSearch && firstSearch < lagos.to);
  const nextUtcDay = new Date("2026-11-25T12:00:00Z");
  assert.ok(resolveOverviewRange(undefined, nextUtcDay, "UTC").from > firstSearch);
  assert.ok(resolveOverviewRange(undefined, nextUtcDay, "Africa/Lagos").from <= firstSearch);
});

test("November 25 synthetic snapshot counts 40 BOT searches in Lagos versus 21 from UTC midnight", () => {
  const snapshot = new Date("2026-11-25T23:00:00.000Z");
  const custom = { range: "custom", from: "2026-11-25", to: "2026-11-25" };
  const lagos = resolveOverviewRange(custom, snapshot, "Africa/Lagos");
  const utc = resolveOverviewRange(custom, snapshot, "UTC");
  const countableBotRows = [
    ...Array.from({ length: 19 }, (_, minute) => new Date(Date.parse("2026-11-24T23:00:00Z") + minute * 60_000)),
    ...Array.from({ length: 21 }, (_, minute) => new Date(Date.parse("2026-11-25T00:00:00Z") + minute * 60_000)),
    new Date("2026-11-24T22:59:59.999Z"),
    snapshot,
  ];
  const botTotal = ({ from, to }: { from: Date; to: Date }) => {
    const count = countableBotRows.filter(createdAt => from <= createdAt && createdAt < to).length;
    return partitionOperationalGroups([
      { kind: "searches", source: "BOT", status: "SUCCESS", count, latency: 0 },
    ]).searches.applications.BOT.total;
  };

  assert.equal(lagos.from.toISOString(), "2026-11-24T23:00:00.000Z");
  assert.equal(lagos.to.toISOString(), snapshot.toISOString());
  assert.equal(utc.from.toISOString(), "2026-11-25T00:00:00.000Z");
  assert.equal(utc.to.toISOString(), snapshot.toISOString());
  assert.equal(botTotal(lagos), 40);
  assert.equal(botTotal(utc), 21);
});

test("rolling date filters retain their exact elapsed duration across daylight saving", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  for (const range of ["24h", "7d", "30d"] as const) {
    assert.deepEqual(adminRollingRange(range, now, "America/New_York"), adminRollingRange(range, now, "UTC"));
  }
});

test("custom reporting dates use local days and stop at now for the current day", () => {
  const now = new Date("2026-11-24T23:45:00Z");
  const raw = { range: "custom", from: "2026-11-25", to: "2026-11-25" };
  const lagos = resolveOverviewRange(raw, now, "Africa/Lagos");
  assert.equal(lagos.invalidCustom, false);
  assert.equal(lagos.from.toISOString(), "2026-11-24T23:00:00.000Z");
  assert.equal(lagos.to.toISOString(), now.toISOString());
  assert.equal(resolveOverviewRange(raw, now, "UTC").invalidCustom, true);

  const historical = adminCustomDateRange("2026-03-08", "2026-03-08", now, "America/New_York", 1);
  assert.equal(historical?.from.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(historical?.to.toISOString(), "2026-03-09T04:00:00.000Z");
  assert.equal(adminCustomDateRange("2026-03-08", "2026-03-09", now, "America/New_York", 1), null);
});

test("Users and Provider Handoffs fall back to UTC and retain legacy rolling windows and unbounded history", () => {
  assert.equal(parseAdminIdentityDate(undefined), "today");
  assert.equal(adminIdentityDateBounds("today", now)?.from.toISOString(), "2026-11-19T00:00:00.000Z");
  assert.equal(adminIdentityDateBounds("today", now)?.to.toISOString(), now.toISOString());
  assert.equal(adminIdentityDateBounds("24h", now)?.from.toISOString(), "2026-11-18T12:00:00.000Z");
  assert.equal(adminIdentityDateBounds("all", now), null);
  assert.deepEqual(resolveHandoffDateRange({}, now), { range: "today", from: "2026-11-19T00:00:00.000Z", to: null });
  assert.equal(resolveHandoffDateRange({range:"24h"}, now).range, "24h");
  assert.deepEqual(resolveHandoffDateRange({ range: "all" }, now), { range: "all", from: null, to: null });
});

test("Record directories submit local dates and preserve timestamp bookmarks with a single Apply action", () => {
  const code = readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8");
  assert.match(code, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(code, /<AdminCalendarInput mode=\{\w+ \? "datetime-local" : "date"\} timeZone=\{timeZone\}/);
  assert.match(code, /type="hidden" name="from"/);
  assert.match(code, /type="hidden" name="to"/);
  assert.doesNotMatch(code, /Apply custom range/);
});
