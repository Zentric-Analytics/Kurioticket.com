import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVICE_HISTORY_PAGE_SIZE, parseDeviceHistoryQuery, deviceTodayWindow,
  deviceHistoryWindow, deviceHistoryHref,
} from "./adminDeviceHistory";

const now = new Date("2026-11-20T15:10:00.000Z");

test("Today uses calendar UTC midnight, not rolling 24 hours", () => {
  assert.equal(deviceTodayWindow(now).gte.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(deviceTodayWindow(now).lte.toISOString(), "2026-11-20T15:10:00.000Z");
  assert.equal(DEVICE_HISTORY_PAGE_SIZE, 20);
});
test("History defaults to all retained sessions and valid first page", () => {
  const parsed = parseDeviceHistoryQuery({});
  assert.deepEqual(parsed, { ok: true, query: { range: "all", page: 1 } });
  if (!parsed.ok) return;
  assert.equal(deviceHistoryWindow(parsed.query, now).lte.toISOString(), now.toISOString());
});
test("Custom history uses inclusive UTC days with exclusive upper bound", () => {
  const parsed = parseDeviceHistoryQuery({ range: "custom", from: "2026-10-01", to: "2026-10-23", page: "2" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const window = deviceHistoryWindow(parsed.query, now);
  assert.equal(window.gte.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal("lt" in window && window.lt?.toISOString(), "2026-10-24T00:00:00.000Z");
  assert.equal(deviceHistoryHref("/admin/users/user/id/devices", parsed.query),
    "/admin/users/user/id/devices?range=custom&page=2&from=2026-10-01&to=2026-10-23");
});
test("Invalid, duplicated or inverted device date filters are rejected", () => {
  for (const query of [
    { page: "0" }, { page: "-2" }, { page: "1000001" },
    { page: ["1", "2"] }, { range: ["all", "today"] },
    { range: "invalid" }, { range: "custom", from: "2026-02-30", to: "2026-03-01" },
    { range: "custom", from: "2026-11-21", to: "2026-11-20" },
    { range: "custom", from: "2026-11-20" },
  ]) assert.equal(parseDeviceHistoryQuery(query).ok, false, JSON.stringify(query));
});
test("Changing from custom dates to a preset ignores stale date inputs", () => {
  const parsed = parseDeviceHistoryQuery({ range: "today", from: "2025-01-01", to: "2025-01-02" });
  assert.deepEqual(parsed, { ok: true, query: { range: "today", page: 1 } });
});
