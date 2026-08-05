import assert from "node:assert/strict";
import test from "node:test";
import { formatDealsDate, getDealsRentalDays, getDealsStayNights, titleCaseDealsLabel } from "./dealsTripPresentation";

test("shared Deals trip presentation preserves date-only and wall-clock formatting", () => {
  assert.match(formatDealsDate("2026-08-01", "en-US", false), /Aug 1, 2026/);
  assert.match(formatDealsDate("2026-08-01T09:30", "en-US", true), /9:30 AM/);
  assert.equal(formatDealsDate("not a date", "en-US", true), "not a date");
  assert.equal(getDealsStayNights("2026-08-01", "2026-08-03"), 2);
  assert.equal(getDealsRentalDays("2026-08-03", "2026-08-05"), 2);
  assert.equal(titleCaseDealsLabel("DELUXE KING ROOM"), "Deluxe King Room");
});
