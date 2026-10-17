import assert from "node:assert/strict";
import test from "node:test";
import { formatCarResultsScheduleSummary, formatCompactCarResultsScheduleSummary } from "./carResultsSummary";

test("formats the exact English rental schedule without timezone shifts", () => {
  assert.equal(formatCarResultsScheduleSummary({
    pickupDate: "2026-09-09",
    pickupTime: "10:00",
    dropoffDate: "2026-09-11",
    dropoffTime: "10:00",
    locale: "en-US",
  }), "Wed. Sep 9 at 10:00 AM – Fri. Sep 11 at 10:00 AM");

  assert.equal(formatCarResultsScheduleSummary({
    pickupDate: "2026-09-08",
    pickupTime: "09:30",
    dropoffDate: "2026-09-10",
    dropoffTime: "17:00",
    locale: "en-US",
  }), "Tue. Sep 8 at 9:30 AM – Thu. Sep 10 at 5:00 PM");
});

test("English weekdays always use a full stop and never a comma", () => {
  const weekdays = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
  weekdays.forEach((weekday, dayOffset) => {
    const day = String(6 + dayOffset).padStart(2, "0");
    const summary = formatCarResultsScheduleSummary({
      pickupDate: `2026-09-${day}`,
      pickupTime: "10:00",
      locale: "en-US",
    });
    assert.match(summary, new RegExp(`^${weekday.replace(".", "\\.")} `));
    assert.doesNotMatch(summary, /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),/);
  });
});

test("fails safely when schedule values are missing or invalid", () => {
  assert.equal(formatCarResultsScheduleSummary({ pickupDate: "invalid", pickupTime: "25:00" }), "");
  assert.equal(formatCarResultsScheduleSummary({ pickupDate: "2026-02-30", pickupTime: "10:00" }), "10:00 AM");
  assert.doesNotMatch(formatCarResultsScheduleSummary({ pickupDate: "2026-09-09" }), /Invalid Date|NaN|undefined| at$/);
});

test("compact native schedule respects locale day/month and 12-hour or 24-hour time conventions", () => {
  const input={pickupDate:"2026-10-17",dropoffDate:"2026-10-19",pickupTime:"10:30",dropoffTime:"18:00"};
  const us=formatCompactCarResultsScheduleSummary({...input,locale:"en-US"});
  const gb=formatCompactCarResultsScheduleSummary({...input,locale:"en-GB"});
  assert.match(us,/Oct 17/);
  assert.match(gb,/17 Oct/);
  assert.match(us,/AM/);
  assert.doesNotMatch(gb,/AM|PM/);
  assert.match(gb,/18:00/);
  assert.doesNotMatch(us,/Invalid Date|NaN/);
});
