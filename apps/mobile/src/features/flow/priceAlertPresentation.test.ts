import assert from "node:assert/strict";
import test from "node:test";
import type { MobilePriceAlert } from "../../api/travelApi";
import { formatLastChecked, formatPriceAlertAmount, formatPriceAlertDateRange, formatTravelerCount, priceAlertTripSummary, priceDifferencePresentation, statusLabel } from "./priceAlertPresentation";

test("formats date-only flight dates without timezone-sensitive parsing", () => {
  assert.equal(formatPriceAlertDateRange("2026-08-25", "2026-08-26"), "Aug 25–26");
  assert.equal(formatPriceAlertDateRange("2026-08-30", "2026-09-02"), "Aug 30 – Sep 2");
  assert.equal(formatPriceAlertDateRange("2026-10-09"), "Oct 9");
  assert.equal(formatPriceAlertDateRange("not-a-date"), null);
});

test("formats only valid positive traveler counts with correct grammar", () => {
  assert.equal(formatTravelerCount(1), "1 traveler");
  assert.equal(formatTravelerCount("2"), "2 travelers");
  assert.equal(formatTravelerCount("many"), null);
  assert.equal(formatTravelerCount(0), null);
  assert.equal(formatTravelerCount(1.5), null);
});

test("formats safe amounts and target comparisons without floating-point noise", () => {
  assert.equal(formatPriceAlertAmount("USD", "100"), "USD 100");
  assert.equal(priceDifferencePresentation("USD", "100", "124"), "USD 24 above target");
  assert.equal(priceDifferencePresentation("USD", "100", "90"), "USD 10 below target");
  assert.equal(priceDifferencePresentation("USD", "100", "100"), "At target");
  assert.equal(priceDifferencePresentation("USD", "0.1", "0.3"), "USD 0.2 above target");
  assert.equal(formatPriceAlertAmount("USD", "broken"), null);
  assert.equal(priceDifferencePresentation("USD", "broken", "100"), null);
});

test("formats bounded relative last-checked times and omits malformed timestamps", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");
  assert.equal(formatLastChecked("2026-08-25T11:59:40.000Z", now), "just now");
  assert.equal(formatLastChecked("2026-08-25T11:48:00.000Z", now), "12 min ago");
  assert.equal(formatLastChecked("2026-08-25T10:00:00.000Z", now), "2 hr ago");
  assert.equal(formatLastChecked("2026-08-24T10:00:01.000Z", now), "yesterday");
  assert.equal(formatLastChecked("2026-08-25T12:05:00.000Z", now), "just now");
  assert.equal(formatLastChecked("invalid", now), null);
});

test("summaries and labels support flights, statuses, and hotel alerts safely", () => {
  const base = { id: "a", origin: "LOS", destination: "ABV", targetPrice: "100", currency: "USD", status: "ACTIVE", createdAt: "", updatedAt: "", lastSeenPrice: null, lastCheckedAt: null } as const;
  const flight: MobilePriceAlert = { ...base, type: "FLIGHT", query: { tripType: "round-trip", departureDate: "2026-08-25", returnDate: "2026-08-26", travelers: 1, cabinClass: "economy" } };
  assert.deepEqual(priceAlertTripSummary(flight), { primary: "Round trip · Aug 25–26", secondary: "1 traveler · Economy" });
  assert.equal(statusLabel("ACTIVE"), "Active");
  assert.equal(statusLabel("PAUSED"), "Paused");
  assert.deepEqual(priceAlertTripSummary({ ...base, type: "HOTEL", query: {} }), { primary: "Hotel alert", secondary: null });
});
