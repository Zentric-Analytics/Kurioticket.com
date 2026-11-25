import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminReportingTimeZonePreference } from "./adminReportingTimeZonePreference";

test("Admin reporting preferences require supported modes and IANA zones", () => {
  assert.deepEqual(parseAdminReportingTimeZonePreference({ mode: "manual", timeZone: "Africa/Lagos" }), {
    mode: "manual", timeZone: "Africa/Lagos",
  });
  assert.deepEqual(parseAdminReportingTimeZonePreference({ mode: "automatic", timeZone: "UTC" }), {
    mode: "automatic", timeZone: "UTC",
  });
  for (const value of [null, "Africa/Lagos", {}, { mode: "unknown", timeZone: "UTC" },
    { mode: "manual", timeZone: "+01:00" }, { mode: "manual", timeZone: "Invalid/Zone" },
    { mode: "manual", timeZone: 2 }, { mode: "automatic" }]) {
    assert.equal(parseAdminReportingTimeZonePreference(value), null);
  }
});
