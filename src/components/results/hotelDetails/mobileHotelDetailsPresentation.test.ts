import assert from "node:assert/strict";
import test from "node:test";
import { formatMobileHotelPrice, mobileHotelStay } from "./mobileHotelDetailsPresentation";

test("Preview stay dates use day-first labels and rooms-first occupancy", () => {
  assert.deepEqual(mobileHotelStay({ checkIn: "2026-09-24", checkOut: "2026-09-30", guests: "2", rooms: "1" }, "en-US", 2026), {
    dates: "24 Sep – 30 Sep", nights: "6 nights", occupancy: "1 room, 2 guests",
  });
});

test("mobile symbols retain the already-converted amount and currency precision", () => {
  assert.equal(formatMobileHotelPrice({ amount: 1050, currency: "USD", formatted: "US$1,050.00" }, "Unavailable"), "$1,050.00");
  assert.equal(formatMobileHotelPrice({ amount: 1200, currency: "JPY", formatted: "JPY 1,200" }, "Unavailable"), "¥1,200");
  assert.equal(formatMobileHotelPrice(null, "Unavailable"), "Unavailable");
});

test("cross-year stays retain both years and invalid dates never produce a false stay", () => {
  assert.equal(mobileHotelStay({ checkIn: "2026-12-31", checkOut: "2027-01-02" }, "en-US", 2026).dates, "31 Dec 2026 – 2 Jan 2027");
  assert.equal(mobileHotelStay({ checkIn: "invalid", checkOut: "2026-09-30" }).nights, "");
  assert.equal(mobileHotelStay({ checkIn: "2026-09-30", checkOut: "2026-09-24" }).dates, "Stay dates unavailable");
});
