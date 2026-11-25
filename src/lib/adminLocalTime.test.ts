import assert from "node:assert/strict";
import test from "node:test";
import {
  adminCalendarDateField,
  adminCalendarRange,
  adminLocalDate,
  adminLocalDateTime,
  adminLocalDateTimeToDate,
  adminStartOfLocalDay,
  formatAdminTimeZoneLabel,
  formatViewerTimestamp,
  resolveAdminTimeZone,
  validViewerTimeZone,
  viewerTodayStart,
} from "./adminLocalTime";

test("search timestamps display in the viewer's timezone, not UTC", () => {
  const instant = "2026-11-24T09:28:33.356Z";
  assert.match(formatViewerTimestamp(instant, "Africa/Lagos"), /10:28/);
  assert.match(formatViewerTimestamp(instant, "UTC"), /9:28/);
  assert.match(formatViewerTimestamp(instant, "Africa/Lagos", "2026-11-24T12:00:00Z"), /^Today, 10:28/);
});

test("Today starts at viewer-local midnight and can be the previous UTC day", () => {
  const now = new Date("2026-11-24T11:30:00Z");
  assert.equal(viewerTodayStart(now, "Africa/Lagos"), "2026-11-23T23:00:00.000Z");
  assert.equal(viewerTodayStart(now, "UTC"), "2026-11-24T00:00:00.000Z");
  assert.equal(viewerTodayStart(now, "America/New_York"), "2026-11-24T05:00:00.000Z");
});

test("DST offsets resolve using local midnight instead of the current offset", () => {
  assert.equal(viewerTodayStart(new Date("2026-03-08T18:00:00Z"), "America/New_York"), "2026-03-08T05:00:00.000Z");
  assert.equal(viewerTodayStart(new Date("2026-11-01T18:00:00Z"), "America/New_York"), "2026-11-01T04:00:00.000Z");
});

test("untrusted timezone values fail closed to UTC interpretation", () => {
  assert.equal(validViewerTimeZone("Africa/Lagos"), "Africa/Lagos");
  const legacyZone = validViewerTimeZone("US/Eastern");
  assert.ok(legacyZone);
  assert.equal(viewerTodayStart(new Date("2026-11-25T12:00:00Z"), legacyZone), "2026-11-25T05:00:00.000Z");
  assert.equal(validViewerTimeZone("+01:00"), null);
  assert.equal(validViewerTimeZone("not-a-timezone"), null);
  assert.equal(validViewerTimeZone("x".repeat(81)), null);
  assert.equal(resolveAdminTimeZone(["Africa/Lagos"]), "UTC");
  assert.equal(viewerTodayStart(new Date("2026-11-25T12:00:00Z"), "invalid"), "2026-11-25T00:00:00.000Z");
});

test("time zone labels use the offset at the given instant", () => {
  const winter = new Date("2026-11-25T12:00:00Z");
  const summer = new Date("2026-07-25T12:00:00Z");
  assert.equal(formatAdminTimeZoneLabel("Africa/Lagos", winter), "WAT (UTC+1)");
  assert.equal(formatAdminTimeZoneLabel("Europe/London", winter), "GMT (UTC+0)");
  assert.equal(formatAdminTimeZoneLabel("Europe/London", summer), "BST (UTC+1)");
  assert.equal(formatAdminTimeZoneLabel("America/New_York", winter), "EST (UTC-5)");
  assert.equal(formatAdminTimeZoneLabel("America/New_York", summer), "EDT (UTC-4)");
  assert.equal(formatAdminTimeZoneLabel("Asia/Dubai", winter), "GST (UTC+4)");
  assert.equal(formatAdminTimeZoneLabel("Asia/Kathmandu", winter), "UTC+5:45");
});

test("calendar-day ranges have 23 or 25 hours on DST transition dates", () => {
  for (const [day, zone, from, to] of [
    ["2026-03-29", "Europe/London", "2026-03-29T00:00:00.000Z", "2026-03-29T23:00:00.000Z"],
    ["2026-10-25", "Europe/London", "2026-10-24T23:00:00.000Z", "2026-10-26T00:00:00.000Z"],
    ["2026-03-08", "America/New_York", "2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["2026-11-01", "America/New_York", "2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["2026-11-25", "Asia/Dubai", "2026-11-24T20:00:00.000Z", "2026-11-25T20:00:00.000Z"],
  ]) {
    const bounds = adminCalendarRange(day, day, zone);
    assert.ok(bounds);
    assert.equal(bounds.from.toISOString(), from);
    assert.equal(bounds.to.toISOString(), to);
  }
});

test("calendar-day boundaries handle a transition at midnight", () => {
  assert.equal(adminStartOfLocalDay("2026-03-08", "America/Havana")?.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(adminStartOfLocalDay("2026-11-01", "America/Havana")?.toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(adminCalendarRange("2011-12-30", "2011-12-30", "Pacific/Apia"), null);
});

test("local date time inputs reject gaps and use the earlier occurrence on overlap", () => {
  const zone = "America/New_York";
  const noon = new Date("2026-11-25T17:15:00Z");
  assert.equal(adminLocalDateTime(noon, zone), "2026-11-25T12:15");
  assert.equal(adminLocalDateTimeToDate(adminLocalDateTime(noon, zone), zone)?.toISOString(), noon.toISOString());
  assert.equal(adminLocalDateTimeToDate("2026-11-01T01:30:00.500", zone)?.toISOString(), "2026-11-01T05:30:00.500Z");
  assert.equal(adminLocalDateTimeToDate("2026-03-08T02:30", zone), null);
  assert.equal(adminLocalDateTimeToDate("2026-02-30T12:00", zone), null);
  assert.equal(adminLocalDateTimeToDate("2026-11-25T24:00", zone), null);
  assert.equal(adminLocalDateTimeToDate("2026-11-25T12:00Z", zone), null);
  assert.equal(adminLocalDate(new Date("2026-11-24T23:30:00Z"), "Africa/Lagos"), "2026-11-25");
});

test("date fields display the last included day for an exclusive midnight bound", () => {
  assert.equal(adminCalendarDateField("2026-11-25", "Africa/Lagos"), "2026-11-25");
  assert.equal(adminCalendarDateField("", "Africa/Lagos"), "");
  assert.equal(adminCalendarDateField("2026-11-25T23:00:00.000Z", "Africa/Lagos"), "2026-11-26");
  assert.equal(adminCalendarDateField("2026-11-25T23:00:00.000Z", "Africa/Lagos", true), "2026-11-25");
});
