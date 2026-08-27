import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTravelDateDisplay,
  formatTravelDateRangeDisplay,
  parseTravelCalendarDate,
} from "./travelDateDisplay";

test("formats canonical en-US travel dates and ranges", () => {
  assert.equal(
    formatTravelDateDisplay("2026-10-01", "en-US"),
    "Thu, Oct 1, 2026",
  );
  assert.equal(
    formatTravelDateRangeDisplay("2026-10-01", "2026-12-31", "en-US"),
    "Thu, Oct 1, 2026 — Thu, Dec 31, 2026",
  );
  assert.equal(
    formatTravelDateRangeDisplay("2026-08-28", "2026-08-31", "en-US"),
    "Fri, Aug 28, 2026 — Mon, Aug 31, 2026",
  );
});

test("parses an ISO search value as a local calendar date without a UTC shift", () => {
  const parsed = parseTravelCalendarDate("2026-10-01");
  assert.ok(parsed);
  assert.deepEqual(
    [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()],
    [2026, 10, 1],
  );
});

test("fails safely for empty and malformed dates", () => {
  for (const value of ["", "2026-02-30", "2026-1-01", "not-a-date"]) {
    assert.equal(formatTravelDateDisplay(value, "en-US"), null);
  }
  assert.equal(formatTravelDateRangeDisplay("2026-10-01", "", "en-US"), null);
});

test("uses the normalized locale for non-English output", () => {
  assert.equal(
    formatTravelDateDisplay("2026-10-01", "de"),
    "Do., 1. Okt. 2026",
  );
});
