import assert from "node:assert/strict";
import test from "node:test";
import { desktopHotelOfferPrice, desktopHotelReviewScore } from "./desktopHotelDetailsModel";
import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

const offer: HotelDetailsProviderOffer = { id: "a", providerName: "Provider A", nightlyPrice: "$100", totalPrice: "$300", taxesAndFeesLabel: "Tax payable at property", action: { kind: "provider-handoff", providerOfferId: "opaque-a" } };
test("desktop deal price keeps the selected provider, stay total, and terms together", () => {
  assert.deepEqual(desktopHotelOfferPrice(offer, "Estimated total", "{{price}} per night"), { amount: "$300", basis: "Estimated total", provider: "Provider A", title: undefined, ariaLabel: undefined, terms: "Tax payable at property" });
  assert.equal(desktopHotelOfferPrice({ ...offer, providerName: "Provider B", totalPrice: "$390" }, "Total", "{{price}} per night")?.amount, "$390");
});
test("an offer without a stay total shows its nightly basis instead of borrowing a property total", () => {
  const price = desktopHotelOfferPrice({ ...offer, totalPrice: undefined }, "Total", "{{price}} per night");
  assert.equal(price?.amount, "$100"); assert.equal(price?.basis, "per night");
  assert.equal(desktopHotelOfferPrice(undefined, "Total", "{{price}} per night"), null);
});
test("desktop review scale is restored without duplicating an existing denominator", () => {
  assert.equal(desktopHotelReviewScore("8.5", 10), "8.5 / 10");
  assert.equal(desktopHotelReviewScore("4.5 / 5", 5), "4.5 / 5");
  assert.equal(desktopHotelReviewScore("", 10), "");
});
