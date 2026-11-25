import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { activityCustomDateBound, normalizeUserActivityQuery } from "./adminActivityDateQuery";
import { deviceTodayWindow } from "./adminDeviceHistory";
import { resetStaleHandoffDateCursor, resolveHandoffDateRange } from "./adminHandoffDateRange";
import { activityWindow, parseActivityFilters } from "./adminIdentityActivity";
import { adminIdentityDateBounds } from "./adminIdentityDirectory";
import { parsePageHistoryQuery } from "./adminPageHistory";
import { journeyWindow, selectedJourneyRange } from "./adminJourneyDateRange";
import { resetStaleJourneyDateCursor } from "./adminJourneyDateCursor";
import { encodeAdminJourneyCursor } from "@/services/adminJourneyContract";
import { encodeAdminOperationalCursor } from "@/services/adminOperationalReadContract";

const searchActivity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
const searchControls = readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8");
const journeys = readFileSync("src/app/admin/journeys/page.tsx", "utf8");
const journeyControls = readFileSync("src/components/admin/JourneyDateRangeFields.tsx", "utf8");

test("Visitor Journeys defaults to the current UTC day without altering retained history", () => {
  const now = new Date("2026-11-18T19:37:25.000Z");
  assert.equal(selectedJourneyRange({}), "today");
  assert.deepEqual(journeyWindow({}, now), {
    from: "2026-11-18T00:00:00.000Z",
    to: "2026-11-18T19:37:25.000Z",
  });
  assert.equal(selectedJourneyRange({ from: "2026-11-10T00:00:00.000Z" }), "custom");
  assert.equal(selectedJourneyRange({ range: "today" }), "today");
  assert.deepEqual(journeyWindow({ range: "all" }, now), {
    from: "1970-01-01T00:00:00.000Z",
    to: now.toISOString(),
  });
});

test("multiple-filter Journeys and Search Activity pages retain Apply-only submission", () => {
  assert.match(journeys, /aria-label="Filter visitor journeys"/);
  assert.match(journeys, /<button type="submit"/);
  assert.match(journeys, /Apply filters/);
  assert.match(journeyControls, /<AdminOperationalDateRangeFields/);
  assert.match(searchActivity, /<AdminOperationalDateRangeFields/);
  assert.match(searchControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(searchActivity, /return "today"/);
  assert.match(searchActivity, /adminRollingRange\(range, now, timeZone\)\.from/);
  assert.match(searchActivity, /<button type="submit"/);
  assert.match(searchActivity, /Apply filters/);
});

test("Activity, journeys, handoffs, devices and Users include observations shortly after Nigerian midnight", () => {
  const now = new Date("2026-11-24T23:30:00.000Z");
  const observed = new Date("2026-11-24T23:05:00.000Z");
  const timeZone = "Africa/Lagos";
  const expected = "2026-11-24T23:00:00.000Z";
  const activity = normalizeUserActivityQuery({}, now, timeZone);
  const pages = parsePageHistoryQuery({}, now, timeZone);
  assert.ok(pages.ok);
  const expectedStarts = [
    activity.from,
    pages.query.filters.from,
    journeyWindow({}, now, timeZone).from,
    resolveHandoffDateRange({}, now, timeZone).from,
    deviceTodayWindow(now, timeZone).gte.toISOString(),
    adminIdentityDateBounds("today", now, undefined, undefined, timeZone)?.from.toISOString(),
  ];
  for (const from of expectedStarts) {
    assert.equal(from, expected);
    assert.ok(observed >= new Date(expected) && observed < now);
  }
  assert.notEqual(normalizeUserActivityQuery(activity, now, "Asia/Dubai").from, expected);
});

test("New York custom date-only filters cover the complete 23-hour local day across sections", () => {
  const date = "2026-03-08";
  const now = new Date("2026-03-10T00:00:00Z");
  const timeZone = "America/New_York";
  const input = { range: "custom", from: date, to: date };
  const expected = { from: "2026-03-08T05:00:00.000Z", to: "2026-03-09T04:00:00.000Z" };
  const activity = parseActivityFilters(input, timeZone);
  assert.ok(activity.ok);
  const window = activityWindow(activity.filters);
  assert.equal(window.gte?.toISOString(), expected.from);
  assert.equal(window.lt?.toISOString(), expected.to);
  assert.deepEqual(journeyWindow(input, now, timeZone), expected);
  assert.deepEqual(resolveHandoffDateRange(input, now, timeZone), { range: "custom", ...expected });
});

test("custom clock values are localized while explicit investigation instants stay unchanged", () => {
  const timeZone = "America/New_York";
  const local = "2026-03-08T03:15";
  assert.equal(activityCustomDateBound(local, "from", timeZone), "2026-03-08T07:15:00.000Z");
  assert.equal(activityCustomDateBound(local, "from", "Africa/Lagos"), "2026-03-08T02:15:00.000Z");
  const explicit = "2026-03-08T07:15:31.000Z";
  assert.equal(activityCustomDateBound(explicit, "from", timeZone), explicit);
  assert.equal(activityCustomDateBound(explicit, "from", "Africa/Lagos"), explicit);
});

test("Today continuations keep their cutoff in the same zone and restart when the date window changes", () => {
  const now = new Date("2026-11-25T15:00:00.000Z");
  const timeZone = "Africa/Lagos";
  const from = "2026-11-24T23:00:00.000Z";
  const to = "2026-11-25T13:00:00.000Z";
  const position = { id: "record_123", at: "2026-11-25T11:00:00.000Z" };
  const journey = { range: "today", cursor: encodeAdminJourneyCursor({
    version: 1, kind: "list", ...position, scope: { from, to, environment: "production", identity: "all" },
  }) };
  assert.equal(resetStaleJourneyDateCursor(journey, now, timeZone), journey);
  assert.deepEqual(resetStaleJourneyDateCursor(journey, now, "Asia/Dubai"), { range: "today" });

  const handoffs = { range: "today", pageTrail: "first", from,
    cursor: encodeAdminOperationalCursor("handoffs", { from, to: null }, position) };
  assert.equal(resetStaleHandoffDateCursor(handoffs, resolveHandoffDateRange(handoffs, now, timeZone)), handoffs);
  assert.deepEqual(
    resetStaleHandoffDateCursor(handoffs, resolveHandoffDateRange(handoffs, now, "Asia/Dubai")),
    { range: "today", from },
  );
  const rolling = { ...handoffs, range: "7d" };
  assert.equal(resetStaleHandoffDateCursor(rolling, resolveHandoffDateRange(rolling, now, "Asia/Dubai")), rolling);
});
