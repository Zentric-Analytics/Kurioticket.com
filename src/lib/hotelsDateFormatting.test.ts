import assert from "node:assert/strict";
import test from "node:test";

import { formatCompactHotelDateRange } from "./hotelsDateFormatting";

test("formats compact en-US Hotel calendar-date ranges", () => {
  const cases = [
    ["2026-09-04", "2026-09-06", "Sep 4 – 6, 2026"],
    ["2026-09-05", "2026-09-07", "Sep 5 – 7, 2026"],
    ["2026-09-29", "2026-10-02", "Sep 29 – Oct 2, 2026"],
    ["2026-12-30", "2027-01-02", "Dec 30, 2026 – Jan 2, 2027"],
    ["2026-09-04", "2026-09-04", "Sep 4, 2026"],
  ] as const;

  for (const [start, end, expected] of cases) {
    const result = formatCompactHotelDateRange(start, end, "en-US");
    assert.equal(result, expected);
    assert.doesNotMatch(
      result ?? "",
      /\(day:|day:|undefined|Invalid Date/,
    );
  }
});

test("rejects invalid or reversed Hotel calendar-date ranges", () => {
  assert.equal(
    formatCompactHotelDateRange("2026-02-31", "2026-03-02", "en-US"),
    null,
  );
  assert.equal(
    formatCompactHotelDateRange("2026-09-07", "2026-09-05", "en-US"),
    null,
  );
});
