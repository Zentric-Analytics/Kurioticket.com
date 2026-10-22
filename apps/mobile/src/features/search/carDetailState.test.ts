import assert from "node:assert/strict";
import test from "node:test";
import type { CarResult } from "../../api/travelApi";
import { canBookCarOffer, comparisonCarOffers, primaryValidCarOffer, sortedValidCarOffers, validHttpsBookingUrl } from "./carDetailState";

type Offer = CarResult["offers"][number];
const offer = (values: Partial<Offer> = {}): Offer => ({
  id: "offer-a", bookingProviderName: "Provider A", rentalCompanyName: "Rental A",
  currency: "USD", pricePerDay: 40, totalPrice: 120, taxesAndFeesIncluded: true,
  payAtPickup: true, freeCancellation: true, bookingUrl: "https://provider.example/book/offer-a", ...values,
});

test("booking requires a complete credential-free HTTPS URL", () => {
  assert.equal(validHttpsBookingUrl("https://provider.example/book"), true);
  for (const value of [undefined, "", " ", "http://provider.example/book", "https://", "not-a-url", "https:///book", "https://user:secret@provider.example/book"]) {
    assert.equal(validHttpsBookingUrl(value), false, String(value));
  }
});

test("external booking requires both server bookability and a valid selected offer", () => {
  assert.equal(canBookCarOffer(true, offer()), true);
  assert.equal(canBookCarOffer(false, offer()), false);
  assert.equal(canBookCarOffer(true, undefined), false);
  assert.equal(canBookCarOffer(true, offer({ bookingUrl: undefined })), false);
  assert.equal(canBookCarOffer(true, offer({ bookingUrl: "http://provider.example/book" })), false);
  assert.equal(canBookCarOffer(true, offer({ bookingUrl: "https://" })), false);
});

test("offers select deterministically and invalid totals never become selectable", () => {
  const sorted = sortedValidCarOffers([
    offer({ id: "offer-z", totalPrice: 140 }), offer({ id: "offer-b", totalPrice: 120 }),
    offer({ id: "offer-a", totalPrice: 120 }), offer({ id: "offer-invalid", totalPrice: Number.NaN }),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ["offer-a", "offer-b", "offer-z"]);
});

test("comparison offers expose at most three real distinct prices in deterministic order", () => {
  const selected = comparisonCarOffers([
    offer({ id: "same-price-b", pricePerDay: 40, totalPrice: 120 }),
    offer({ id: "same-price-a", pricePerDay: 40, totalPrice: 120 }),
    offer({ id: "mid", pricePerDay: 45, totalPrice: 135 }),
    offer({ id: "high", pricePerDay: 50, totalPrice: 150 }),
    offer({ id: "fourth", pricePerDay: 55, totalPrice: 165 }),
    offer({ id: "invalid", totalPrice: Number.NaN }),
  ]);
  assert.deepEqual(selected.map((item) => item.id), ["same-price-a", "mid", "high"]);
  assert.equal(comparisonCarOffers([offer()], 0).length, 0);
});

test("primary offer mirrors web total, daily price, then id precedence", () => {
  const selected = primaryValidCarOffer([
    offer({ id: "z", totalPrice: 120, pricePerDay: 41 }),
    offer({ id: "b", totalPrice: 120, pricePerDay: 40 }),
    offer({ id: "a", totalPrice: 120, pricePerDay: 40 }),
  ]);
  assert.equal(selected?.id, "a");
});