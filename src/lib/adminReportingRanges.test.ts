import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_DEFAULT_REPORTING_RANGE,
  ADMIN_REPORTING_RANGE_OPTIONS,
  ADMIN_REPORTING_RANGE_LABELS,
  adminRollingRange,
} from "./adminReportingRanges";
import { adminIdentityDateBounds, parseAdminIdentityDate } from "./adminIdentityDirectory";
import { resolveHandoffDateRange } from "./adminHandoffDateRange";

const now = new Date("2026-11-19T12:00:00.000Z");
test("Admin reporting menu has exactly five standard options in the required order", () => {
  assert.equal(ADMIN_DEFAULT_REPORTING_RANGE, "24h");
  assert.deepEqual(ADMIN_REPORTING_RANGE_OPTIONS.map(item => item.label), [
    "Last 24 hrs", "Last 7 days", "Last 30 days", "All time", "Custom range",
  ]);
  assert.equal(ADMIN_REPORTING_RANGE_LABELS["24h"], "Last 24 hrs");
  assert.deepEqual(adminRollingRange("24h", now), {
    from: "2026-11-18T12:00:00.000Z", to: now.toISOString(),
  });
  assert.equal(adminRollingRange("7d", now).from, "2026-11-12T12:00:00.000Z");
  assert.equal(adminRollingRange("30d", now).from, "2026-10-20T12:00:00.000Z");
});

test("Users and Provider Handoffs default to 24h but retain unbounded history when requested", () => {
  assert.equal(parseAdminIdentityDate(undefined), "24h");
  assert.equal(adminIdentityDateBounds("24h", now)?.from.toISOString(), "2026-11-18T12:00:00.000Z");
  assert.equal(adminIdentityDateBounds("all", now), null);
  assert.equal(resolveHandoffDateRange({}, now).range, "24h");
  assert.deepEqual(resolveHandoffDateRange({ range: "all" }, now), { range: "all", from: null, to: null });
});

test("Record directories expose custom UTC bounds without a second independent Apply action", () => {
  const code = readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8");
  assert.match(code, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(code, /type="datetime-local"/);
  assert.match(code, /setCustomValidity/);
  assert.match(code, /type="hidden" name="from"/);
  assert.match(code, /type="hidden" name="to"/);
  assert.doesNotMatch(code, /Apply custom range/);
});
