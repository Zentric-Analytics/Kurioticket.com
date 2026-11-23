import assert from "node:assert/strict";
import test from "node:test";
import { adminCalendarDate, adminCalendarDayStart, adminCalendarNextDayStart, adminDisplayDateTime, adminTodayStart, safeAdminTimeZone } from "./adminTimeZone";

test("browser-selected time zones render the same UTC instant in local wall time", () => {
  const instant = "2026-11-23T15:07:00.000Z";
  assert.match(adminDisplayDateTime(instant, "UTC"), /3:07 PM/);
  assert.match(adminDisplayDateTime(instant, "Africa/Lagos"), /4:07 PM/);
  assert.match(adminDisplayDateTime(instant, "America/New_York"), /10:07 AM/);
  assert.equal(adminDisplayDateTime(instant, "Africa/Lagos", "relative", new Date("2026-11-23T17:00:00Z")), "Today, 4:07 PM");
});

test("today is local midnight while UTC persistence and rolling windows remain absolute", () => {
  assert.equal(adminTodayStart(new Date("2026-11-23T15:07:00Z"), "Africa/Lagos").toISOString(), "2026-11-22T23:00:00.000Z");
  assert.equal(adminTodayStart(new Date("2026-11-23T01:00:00Z"), "America/New_York").toISOString(), "2026-11-22T05:00:00.000Z");
  assert.equal(adminCalendarDate(new Date("2026-11-23T00:30:00Z"), "America/New_York"), "2026-11-22");
});

test("DST changes calendar day widths without shifting saved event instants", () => {
  assert.equal(adminCalendarDayStart("2026-03-08", "America/New_York").toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(adminCalendarNextDayStart("2026-03-08", "America/New_York").toISOString(), "2026-03-09T04:00:00.000Z");
  assert.equal(adminCalendarDayStart("2026-11-01", "America/New_York").toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(adminCalendarNextDayStart("2026-11-01", "America/New_York").toISOString(), "2026-11-02T05:00:00.000Z");
});

test("invalid or untrusted cookie time zone is never passed unchecked into Intl", () => {
  assert.equal(safeAdminTimeZone("Invalid/Not_a_zone"), "UTC");
  assert.equal(safeAdminTimeZone("Europe/London"), "Europe/London");
  assert.equal(safeAdminTimeZone("<script>"), "UTC");
  assert.equal(adminDisplayDateTime("not-a-date", "UTC"), "—");
});
