import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelPriceAlertPayload,
  HOTEL_ALERT_DEFAULT_DROP_PERCENT,
  HOTEL_ALERT_MAX_DROP_PERCENT,
  HOTEL_ALERT_MIN_DROP_PERCENT,
  hotelAlertDesiredTotal,
  hotelAlertDropPercentForTarget,
  hotelAlertPriceBasis,
  hotelPriceAlertDuplicateKey,
  hotelPriceAlertMatchesSearch,
} from "./hotelPriceAlerts";
import type { PublicHotelResult } from "@/lib/types";

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


test("Hotel alert percentage model matches native 1-50% drop behavior", () => {
  assert.equal(HOTEL_ALERT_MIN_DROP_PERCENT, 1);
  assert.equal(HOTEL_ALERT_MAX_DROP_PERCENT, 50);
  assert.equal(HOTEL_ALERT_DEFAULT_DROP_PERCENT, 10);
  assert.equal(hotelAlertDesiredTotal(1000, 10, "USD"), 900);
  assert.equal(hotelAlertDropPercentForTarget(1000, 900), 10);
  assert.equal(hotelAlertDesiredTotal(1000, 0, "USD"), 990);
  assert.equal(hotelAlertDesiredTotal(1000, 80, "USD"), 500);
});

test("Hotel alert basis uses the lowest valid stay total and preserves provider currency", () => {
  const results = [
    {
      totalPrice: 800,
      pricePerNight: 400,
      currency: "USD",
      inventoryKind: "bookable",
    },
    {
      totalPrice: 650,
      pricePerNight: 325,
      currency: "USD",
      inventoryKind: "bookable",
    },
  ] as PublicHotelResult[];
  const basis = hotelAlertPriceBasis(results, "USD", { USD: 1 });
  assert.deepEqual(basis, {
    amount: 650,
    currency: "USD",
    providerAmount: 650,
    providerCurrency: "USD",
  });
});

test("Hotel alert search matching ignores target but keeps the exact stay context", () => {
  const search = {
    destination: "Paris",
    checkIn: "2030-04-01",
    checkOut: "2030-04-03",
    guests: 2,
    rooms: 1,
  };
  const alert = {
    id: "alert-1",
    type: "HOTEL" as const,
    destination: "Paris",
    targetPrice: "600",
    currency: "USD",
    status: "PAUSED" as const,
    query: { ...search },
  };
  assert.equal(hotelPriceAlertMatchesSearch(alert, search), true);
  assert.equal(hotelPriceAlertMatchesSearch(alert, { ...search, rooms: 2 }), false);
});
