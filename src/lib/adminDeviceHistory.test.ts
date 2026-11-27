import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVICE_HISTORY_PAGE_SIZE, parseDeviceHistoryQuery, deviceTodayWindow,
  deviceHistoryWindow, deviceHistoryHref, deviceHistoryHrefFromActivity,
} from "./adminDeviceHistory";
import { activityWindow, decodeActivityCursor, encodeActivityCursor, type ActivityFilters } from "./adminIdentityActivity";

const now = new Date("2026-11-20T15:10:00.000Z");

test("Today uses calendar UTC midnight, not rolling 24 hours", () => {
  assert.equal(deviceTodayWindow(now).gte.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(deviceTodayWindow(now).lte.toISOString(), "2026-11-20T15:10:00.000Z");
  assert.equal(DEVICE_HISTORY_PAGE_SIZE, 20);
});
test("History defaults to Today and a valid first page", () => {
  const parsed = parseDeviceHistoryQuery({});
  assert.deepEqual(parsed, { ok: true, query: { range: "today", page: 1 } });
  if (!parsed.ok) return;
  assert.equal(deviceHistoryWindow(parsed.query, now).gte?.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(deviceHistoryWindow(parsed.query, now).lte.toISOString(), now.toISOString());
});
test("Custom history uses inclusive UTC days with exclusive upper bound", () => {
  const parsed = parseDeviceHistoryQuery({ range: "custom", from: "2026-10-01", to: "2026-10-23", page: "2" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const window = deviceHistoryWindow(parsed.query, now);
  assert.equal("gte" in window && window.gte?.toISOString(), "2026-10-01T00:00:00.000Z");
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

test("platform is validated and preserved across device history navigation", () => {
  for (const platform of ["desktop", "mobile", "ios", "android"]) {
    const result = parseDeviceHistoryQuery({ range: "today", platform });
    assert.ok(result.ok);
    assert.equal(result.query.platform, platform);
    assert.match(deviceHistoryHref("/admin/users/user/id/devices", result.query), new RegExp("platform=" + platform));
  }
  assert.equal(parseDeviceHistoryQuery({ platform: "invalid" }).ok, false);
});

test("Activity device links preserve supported periods and the selected identity's return position", () => {
  const filters: ActivityFilters = { tab: "access", stage: "all", product: "all", q: "", order: "newest",
    from: "2026-11-20T00:00:00.000Z", to: now.toISOString() };
  for (const kind of ["user", "guest"] as const) {
    const id = "qa-identity-0001";
    const cursor = encodeActivityCursor({ id: "d-qa-device-0001", at: new Date("2026-11-20T14:00:00.000Z") }, kind, id, filters, "staging");
    const returnHref = "/admin/users/" + kind + "/" + id + "/activity/all?" + new URLSearchParams({
      range: "today", tab: "access", from: filters.from, to: filters.to, cursor,
      usersReturn: "/admin/users/online?platform=android&page=3",
    });
    for (const range of ["all", "today", "7d", "30d"]) {
      const href = deviceHistoryHrefFromActivity(kind, id, filters, range, returnHref, "UTC");
      assert.ok(href);
      const url = new URL(href, "https://kurioticket.test");
      assert.equal(url.pathname, "/admin/users/" + kind + "/" + id + "/devices");
      assert.equal(url.searchParams.get("range"), range);
      assert.equal(url.searchParams.has("from"), false);
      assert.equal(url.searchParams.has("to"), false);
      assert.equal(url.searchParams.get("page"), "1");
      const back = new URL(url.searchParams.get("activityReturn")!, url.origin);
      assert.equal(back.searchParams.get("usersReturn"), "/admin/users/online?platform=android&page=3");
      assert.deepEqual(decodeActivityCursor(back.searchParams.get("cursor")!, kind, id, filters, "staging"),
        { id: "d-qa-device-0001", at: "2026-11-20T14:00:00.000Z" });
    }
  }
});

test("custom device drilldowns preserve whole local calendar days and exact DST-aligned timestamps", () => {
  const path = "/admin/users/user/qa-account-0001/activity/all?range=custom";
  const observedAt = new Date("2026-11-10T15:00:00.000Z");
  for (const window of [
    { timeZone: "UTC", from: "2026-11-01", to: "2026-11-02" },
    { timeZone: "Africa/Lagos", from: "2026-11-01", to: "2026-11-02" },
    { timeZone: "America/New_York", from: "2026-10-31T04:00:00.000Z", to: "2026-11-02T05:00:00.000Z" },
  ]) {
    const filters: ActivityFilters = { tab: "access", stage: "all", product: "all", q: "",
      from: window.from, to: window.to, timeZone: window.timeZone };
    for (const range of ["custom", undefined]) {
      const href = deviceHistoryHrefFromActivity("user", "qa-account-0001", filters, range, path, window.timeZone);
      assert.ok(href);
      const url = new URL(href, "https://kurioticket.test");
      const parsed = parseDeviceHistoryQuery(Object.fromEntries(url.searchParams));
      assert.ok(parsed.ok);
      const deviceWindow = deviceHistoryWindow(parsed.query, observedAt, window.timeZone);
      const activity = activityWindow(filters);
      assert.equal("gte" in deviceWindow && deviceWindow.gte?.toISOString(), activity.gte?.toISOString());
      assert.equal("lt" in deviceWindow && deviceWindow.lt?.toISOString(), activity.lt?.toISOString());
    }
  }
});

test("unrepresentable or invalid device scopes are unavailable instead of broadening the investigation", () => {
  const path = "/admin/users/user/qa-account-0001/activity/all";
  const base: ActivityFilters = { tab: "access", stage: "all", product: "all", q: "",
    from: "2026-11-19T13:00:00.000Z", to: "2026-11-20T13:00:00.000Z" };
  for (const range of ["24h", "90d", "invalid", "custom", undefined]) {
    assert.equal(deviceHistoryHrefFromActivity("user", "qa-account-0001", base, range, path, "UTC"), undefined);
  }
  for (const filters of [{ ...base, from: "" }, { ...base, to: "" }, { ...base, from: "not-a-date" },
    { ...base, from: "2026-02-30", to: "2026-03-01" }]) {
    assert.equal(deviceHistoryHrefFromActivity("user", "qa-account-0001", filters, "custom", path, "UTC"), undefined);
  }
  assert.equal(deviceHistoryHrefFromActivity("user", "../someone", base, "all", path, "UTC"), undefined);
  assert.equal(deviceHistoryHrefFromActivity("user", "qa-account-0001", { ...base, from: "bad" }, "all", path, "UTC"), undefined);
  const safe = deviceHistoryHrefFromActivity("user", "qa-account-0001", base, "today", "https://evil.invalid", "UTC");
  assert.ok(safe);
  assert.equal(new URL(safe, "https://kurioticket.test").searchParams.get("activityReturn"), "/admin/users/user/qa-account-0001/activity");
});
