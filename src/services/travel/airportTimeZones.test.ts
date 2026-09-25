import assert from "node:assert/strict";
import test from "node:test";

import { timezones } from "./airportTimeZones";

test("airport timezone mapping covers observed KAYAK Cars locations", () => {
  assert.equal(timezones.JFK, "America/New_York");
  assert.equal(timezones.EWR, "America/New_York");
  assert.equal(timezones.PAE, "America/Los_Angeles");
  assert.equal(timezones.LHR, "Europe/London");
  assert.equal(timezones.PTY, "America/Panama");
  assert.equal(timezones.LOP, "Asia/Makassar");
});
