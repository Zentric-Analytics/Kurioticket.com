import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelPriceAlertPayload, hotelPriceAlertDuplicateKey } from "./hotelPriceAlerts";

test("Hotel alert payload preserves complete comparable stay context", () => {
  const payload = buildHotelPriceAlertPayload({ destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 }, 450, "usd");
  assert.deepEqual(payload.query, { destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 });
  assert.equal(payload.currency, "USD");
});

test("Hotel duplicate identity includes dates occupancy currency and target", () => {
  const base = { destination: "Paris", targetPrice: 450, currency: "USD", query: { checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 } };
  assert.equal(hotelPriceAlertDuplicateKey(base), hotelPriceAlertDuplicateKey({ ...base, destination: " paris " }));
  assert.notEqual(hotelPriceAlertDuplicateKey(base), hotelPriceAlertDuplicateKey({ ...base, query: { ...base.query, rooms: 2 } }));
});
