import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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

test("Hotel alert payload preserves the chosen property and complete stay context", () => {
  const payload = buildHotelPriceAlertPayload({ destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 }, 450, "usd", { id: "hotel-42", name: "Hotel Paris" });
  assert.deepEqual(payload.query, { destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1, hotelId: "hotel-42", hotelName: "Hotel Paris" });
  assert.equal(payload.currency, "USD");
});

test("Hotel duplicate identity distinguishes hotels at the same destination and dates", () => {
  const base = { destination: "Paris", targetPrice: 450, currency: "USD", query: { hotelId: "hotel-42", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 } };
  assert.equal(hotelPriceAlertDuplicateKey(base), hotelPriceAlertDuplicateKey({ ...base, destination: " paris " }));
  assert.notEqual(hotelPriceAlertDuplicateKey(base), hotelPriceAlertDuplicateKey({ ...base, query: { ...base.query, rooms: 2 } }));
  assert.notEqual(hotelPriceAlertDuplicateKey(base), hotelPriceAlertDuplicateKey({ ...base, query: { ...base.query, hotelId: "hotel-99" } }));
});


test("Hotel alert percentage model matches native 1-15% drop behavior", () => {
  assert.equal(HOTEL_ALERT_MIN_DROP_PERCENT, 1);
  assert.equal(HOTEL_ALERT_MAX_DROP_PERCENT, 15);
  assert.equal(HOTEL_ALERT_DEFAULT_DROP_PERCENT, 10);
  assert.equal(hotelAlertDesiredTotal(1000, 10, "USD"), 900);
  assert.equal(hotelAlertDropPercentForTarget(1000, 900), 10);
  assert.equal(hotelAlertDesiredTotal(1000, 0, "USD"), 990);
  assert.equal(hotelAlertDesiredTotal(1000, 80, "USD"), 850);
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

test("Hotel alert search matching requires the same hotel and stay", () => {
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
    query: { ...search, hotelId: "hotel-42", hotelName: "Hotel Paris" },
  };
  assert.equal(hotelPriceAlertMatchesSearch(alert, search, "hotel-42"), true);
  assert.equal(hotelPriceAlertMatchesSearch(alert, search, "hotel-99"), false);
  assert.equal(hotelPriceAlertMatchesSearch(alert, { ...search, rooms: 2 }, "hotel-42"), false);
  assert.equal(hotelPriceAlertMatchesSearch({ ...alert, query: search }, search, "hotel-42"), false);
});


test("Hotel web price-alert UI labels the slider ceiling as 15%", () => {
  const control = readFileSync(
    new URL("../../components/results/HotelPriceAlertControl.tsx", import.meta.url),
    "utf8",
  );
  assert.match(control, /max=\{HOTEL_ALERT_MAX_DROP_PERCENT\}/);
  assert.match(control, /<span>15%<\/span>/);
  assert.doesNotMatch(control, /<span>50%<\/span>/);
});
