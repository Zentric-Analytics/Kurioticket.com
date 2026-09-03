import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelResultsSummary, formatCompactHotelDateRange, formatHotelOccupancy } from "./hotelResultsSummary";

test("Paris uses its primary label, compact same-month dates, and singular occupancy", () => {
  const canonical = "Paris, France";
  const summary = buildHotelResultsSummary(canonical, "2026-09-03", "2026-09-05", "1", "1", "en-us");
  assert.deepEqual(summary, {
    primary: "Paris",
    dates: "Sep 3 – 5, 2026",
    occupancy: "1 guest, 1 room",
    metadata: "Sep 3 – 5, 2026 · 1 guest, 1 room",
  });
  assert.equal(canonical, "Paris, France", "presentation must not mutate the canonical search value");
});

test("compact calendar dates cover month, year, locale, and invalid boundaries without timezone drift", () => {
  assert.equal(formatCompactHotelDateRange("2026-09-30", "2026-10-02", "en-us"), "Sep 30 – Oct 2, 2026");
  assert.equal(formatCompactHotelDateRange("2026-12-30", "2027-01-02", "en-us"), "Dec 30, 2026 – Jan 2, 2027");
  assert.equal(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "fr"), "3 – 5 sept. 2026");
  assert.equal(formatCompactHotelDateRange("not-a-date", "2026-09-05", "en-us"), null);
  assert.equal(formatCompactHotelDateRange("2026-02-30", "2026-03-02", "en-us"), null);
});

test("English guest and room labels pluralize independently", () => {
  assert.equal(formatHotelOccupancy("1", "1", "en-us"), "1 guest, 1 room");
  assert.equal(formatHotelOccupancy("2", "1", "en-us"), "2 guests, 1 room");
  assert.equal(formatHotelOccupancy("1", "2", "en-us"), "1 guest, 2 rooms");
  assert.equal(formatHotelOccupancy("2", "2", "en-us"), "2 guests, 2 rooms");
});

test("catalogue and custom destinations have safe primary-label fallbacks", () => {
  assert.equal(buildHotelResultsSummary("Paris, France", "2026-09-03", "2026-09-05", "1", "1", "en-us").primary, "Paris");
  assert.equal(buildHotelResultsSummary("A Very Long Custom District, Exampleland", "2026-09-03", "2026-09-05", "2", "1", "en-us").primary, "A Very Long Custom District");
});
