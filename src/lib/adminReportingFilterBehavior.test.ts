import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { journeyWindow, selectedJourneyRange } from "./adminJourneyDateRange";

const searchActivity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
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
  assert.match(journeyControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(journeyControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(journeyControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(journeyControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(searchActivity, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(searchActivity, /return "today"/);
  assert.match(searchActivity, /from\.setTime\(now\.getTime\(\) - 24 \* 60 \* 60 \* 1000\)/);
  assert.match(searchActivity, /<button type="submit"/);
  assert.match(searchActivity, /Apply filters/);
});
