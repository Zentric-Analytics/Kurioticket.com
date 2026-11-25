import assert from "node:assert/strict";
import test from "node:test";
import {
  adminQueueRangeOptions, localQueueDateTime, resolveAdminQueueWindow,
  toAdminQueueDateParams, validateCustomQueueWindow,
  type AdminQueueWindow,
} from "./adminQueueDateRange";

const now = new Date("2026-11-19T12:00:00.000Z");

test("both queue pages default to Today UTC while preserving rolling 24h links", () => {
  const window = resolveAdminQueueWindow({}, now);
  assert.deepEqual(window, { range: "today", from: "2026-11-19T00:00:00.000Z", to: "2026-11-19T12:00:00.000Z" });
  assert.equal(adminQueueRangeOptions[0].label, "Today");
  assert.equal(resolveAdminQueueWindow({range:"24h"}, now).from, "2026-11-18T12:00:00.000Z");
});
test("date ranges include Today UTC, 7 days, 30 days and all time", () => {
  assert.equal(resolveAdminQueueWindow({ range: "today" }, now).from, "2026-11-19T00:00:00.000Z");
  assert.equal(resolveAdminQueueWindow({ range: "7d" }, now).from, "2026-11-12T12:00:00.000Z");
  assert.equal(resolveAdminQueueWindow({ range: "30d" }, now).from, "2026-10-20T12:00:00.000Z");
  assert.deepEqual(resolveAdminQueueWindow({ range: "all", from: now.toISOString(), to: now.toISOString() }, now), { range: "all", from: "", to: "" });
});
test("pagination and status navigation preserve the anchored selected window", () => {
  const saved: AdminQueueWindow = { range: "24h", from: "2026-11-18T09:30:00.000Z", to: "2026-11-19T09:30:00.000Z" };
  assert.deepEqual(resolveAdminQueueWindow(saved, now), saved);
  assert.equal(toAdminQueueDateParams(saved).get("from"), saved.from);
  assert.equal(toAdminQueueDateParams(saved).get("to"), saved.to);
  assert.equal(resolveAdminQueueWindow({ from: saved.from, to: saved.to }, now).range, "custom");
});

test("Today keeps a same-day anchor and recalculates after a zone switch", () => {
  const reference = new Date("2026-11-25T00:20:00.000Z");
  const local = resolveAdminQueueWindow({}, reference, "Africa/Lagos");
  assert.deepEqual(local, { range: "today", from: "2026-11-24T23:00:00.000Z", to: "2026-11-25T00:20:00.000Z" });
  const next = new Date("2026-11-25T00:30:00.000Z");
  assert.deepEqual(resolveAdminQueueWindow(local, next, "Africa/Lagos"), local);
  assert.deepEqual(resolveAdminQueueWindow(local, next, "Asia/Dubai"), {
    range: "today", from: "2026-11-24T20:00:00.000Z", to: next.toISOString(),
  });
  assert.equal(resolveAdminQueueWindow({ range: "7d" }, next, "Asia/Dubai").from, "2026-11-18T00:30:00.000Z");
});

test("custom queue dates use the reporting zone and reject a missing DST hour", () => {
  const zone = "America/New_York";
  const custom = resolveAdminQueueWindow({ range: "custom", from: "2026-03-08T00:30", to: "2026-03-08T04:15" }, now, zone);
  assert.deepEqual(custom, {
    range: "custom", from: "2026-03-08T05:30:00.000Z", to: "2026-03-08T08:15:00.000Z",
  });
  assert.equal(localQueueDateTime(custom.from, zone), "2026-03-08T00:30");
  assert.equal(localQueueDateTime(custom.to, zone), "2026-03-08T04:15");
  assert.equal(validateCustomQueueWindow("2026-03-08T02:30", "2026-03-08T04:15", zone), "Enter valid dates.");
  assert.deepEqual(resolveAdminQueueWindow(custom, now, "Africa/Lagos"), custom);
  assert.deepEqual(resolveAdminQueueWindow({ range: "custom", from: "2026-03-08", to: "2026-03-08" }, now, zone), {
    range: "custom", from: "2026-03-08T05:00:00.000Z", to: "2026-03-09T04:00:00.000Z",
  });
});
test("custom dates validate missing, invalid and reversed intervals", () => {
  assert.equal(validateCustomQueueWindow("", "2026-11-19T10:00"), "Choose both start and end dates.");
  assert.equal(validateCustomQueueWindow("not-a-date", "2026-11-19T10:00"), "Enter valid dates.");
  assert.equal(validateCustomQueueWindow("2026-11-19T11:00", "2026-11-19T10:00"), "Start must be earlier than end.");
  assert.equal(validateCustomQueueWindow("2026-11-19T09:00", "2026-11-19T10:00"), null);
  assert.equal(localQueueDateTime(""), "");
});
