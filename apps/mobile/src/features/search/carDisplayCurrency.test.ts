import assert from "node:assert/strict";
import test from "node:test";

import type { CarResult } from "../../api/travelApi";
import { presentCarOfferCurrency } from "./carDisplayCurrency";

const offer: CarResult["offers"][number] = {
  id: "offer-1",
  bookingProviderName: "Provider",
  rentalCompanyName: "Rental Co",
  currency: "USD",
  pricePerDay: 50,
  totalPrice: 100,
  taxesAndFeesIncluded: true,
  payAtPickup: false,
  freeCancellation: true,
  bookingUrl: "https://example.com/car",
};

test("Cars converts provider prices into the canonical display currency without mutating the provider offer", () => {
  const presented = presentCarOfferCurrency(offer, "EUR", { USD: 1, EUR: 0.9 });

  assert.notEqual(presented, offer);
  assert.equal(presented.currency, "EUR");
  assert.equal(presented.totalPrice, 90);
  assert.equal(presented.pricePerDay, 45);
  assert.equal(offer.currency, "USD");
  assert.equal(offer.totalPrice, 100);
  assert.equal(offer.pricePerDay, 50);
});

test("Cars keeps authoritative provider prices when conversion is unnecessary or unavailable", () => {
  assert.equal(presentCarOfferCurrency(offer, "USD", { USD: 1 }), offer);
  assert.equal(presentCarOfferCurrency(offer, "EUR", { USD: 1 }), offer);
  assert.equal(presentCarOfferCurrency(offer, "not-a-currency", { USD: 1, EUR: 0.9 }), offer);
});
