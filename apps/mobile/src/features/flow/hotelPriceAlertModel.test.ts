import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelPriceAlertPayload, hotelAlertPresentation, matchingHotelPriceAlert } from "./hotelPriceAlertModel";

const plan = { key: "hotel", summary: "Paris", payload: { destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 } };

test("Hotel alert creation preserves destination dates occupancy currency and target", () => {
  assert.deepEqual(buildHotelPriceAlertPayload(plan, 450, "usd"), { type: "HOTEL", destination: "Paris", targetPrice: 450, mode: "TARGET", currency: "USD", query: plan.payload });
});

test("Hotel alert UI requires a comparable canonical result", () => {
  assert.equal(hotelAlertPresentation("hotel", plan, [] as never[]).enabled, false);
  assert.equal(hotelAlertPresentation("hotel", plan, [{ totalPrice: 450, currency: "USD" }] as never[]).enabled, true);
});

test("Hotel alert reconciliation is bound to the complete search identity", () => {
  const alert = { id: "a", type: "HOTEL", status: "ACTIVE", query: plan.payload };
  assert.equal(matchingHotelPriceAlert([alert as never], plan), alert);
  assert.equal(matchingHotelPriceAlert([{ ...alert, query: { ...plan.payload, rooms: 2 } } as never], plan), undefined);
});
