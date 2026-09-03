import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelResultsSummary,
  formatCompactHotelDateRange,
  formatHotelOccupancy,
} from "./hotelResultsSummary";

test("English compact date ranges cover same month, cross month, and cross year", () => {
  assert.equal(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "en-us"), "Sep 3 – 5, 2026");
  assert.equal(formatCompactHotelDateRange("2026-09-30", "2026-10-02", "en-us"), "Sep 30 – Oct 2, 2026");
  assert.equal(formatCompactHotelDateRange("2026-12-31", "2027-01-02", "en-us"), "Dec 31, 2026 – Jan 2, 2027");
});

test("date-only parsing rejects malformed, impossible, and reversed ranges", () => {
  assert.equal(formatCompactHotelDateRange("not-a-date", "2026-09-05", "en-us"), null);
  assert.equal(formatCompactHotelDateRange("09/03/2026", "2026-09-05", "en-us"), null);
  assert.equal(formatCompactHotelDateRange("2026-02-30", "2026-03-02", "en-us"), null);
  assert.equal(formatCompactHotelDateRange("2026-09-05", "2026-09-03", "en-us"), null);
});

test("date-only formatting is timezone safe and localized without formatRange", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Honolulu";
    assert.equal(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "en-us"), "Sep 3 – 5, 2026");
    process.env.TZ = "Pacific/Kiritimati";
    assert.equal(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "en-us"), "Sep 3 – 5, 2026");
    assert.match(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "de-de") ?? "", /3.*5.*Sept.*2026/);
    assert.match(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "ja") ?? "", /2026.*9.*3.*5/);
    assert.match(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "ko") ?? "", /2026.*9.*3.*5/);
    assert.match(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "ar") ?? "", /2026|٢٠٢٦/);
    assert.match(formatCompactHotelDateRange("2026-09-03", "2026-09-05", "fr") ?? "", /3.*5.*sept.*2026/i);
  } finally {
    process.env.TZ = originalTimezone;
  }
});

test("same-day ranges render one complete date", () => {
  assert.equal(formatCompactHotelDateRange("2026-09-03", "2026-09-03", "en-us"), "Sep 3, 2026");
});

test("Thai Hotel dates explicitly retain the Gregorian stay year", () => {
  const result = formatCompactHotelDateRange("2026-09-03", "2026-09-05", "th") ?? "";
  assert.match(result, /2026/);
  assert.doesNotMatch(result, /2569/);
});

test("English occupancy uses current web singular and plural semantics", () => {
  assert.equal(formatHotelOccupancy(1, 1, "en-us"), "1 guest, 1 room");
  assert.equal(formatHotelOccupancy(1, 2, "en-us"), "1 guest, 2 rooms");
  assert.equal(formatHotelOccupancy(2, 1, "en-us"), "2 guests, 1 room");
  assert.equal(formatHotelOccupancy(2, 2, "en-us"), "2 guests, 2 rooms");
});

test("locale-specific occupancy templates preserve production web order and punctuation", () => {
  assert.equal(formatHotelOccupancy(2, 1, "ja"), "宿泊者2名、1室");
  assert.equal(formatHotelOccupancy(2, 1, "ko"), "투숙객 2명, 객실 1개");
  assert.equal(formatHotelOccupancy(2, 1, "ar"), "2 ضيوف، 1 غرفة");
  assert.equal(formatHotelOccupancy(2, 1, "pl"), "2 gości, 1 pokój");
  assert.equal(formatHotelOccupancy(2, 1, "es-es"), "2 huéspedes, 1 habitación");
});

test("results presentation uses its supplied customer-facing destination and exact English summary", () => {
  assert.deepEqual(buildHotelResultsSummary({
    destination: " Paris ",
    checkIn: "2026-09-03",
    checkOut: "2026-09-05",
    guests: 1,
    rooms: 1,
    locale: "en-us",
  }), {
    destination: "Paris",
    secondaryLine: "Sep 3 – 5, 2026 · 1 guest, 1 room",
  });
});

test("results presentation applies the current web display bounds without mutating search input", () => {
  const input = { destination: "Lagos, Nigeria", checkIn: "2026-09-03", checkOut: "2026-09-05", guests: 20, rooms: 9, locale: "en-us" as const };
  assert.match(buildHotelResultsSummary(input).secondaryLine, /12 guests, 6 rooms$/);
  assert.deepEqual({ guests: input.guests, rooms: input.rooms }, { guests: 20, rooms: 9 });
});
