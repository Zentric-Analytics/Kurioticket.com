import assert from "node:assert/strict";
import test from "node:test";
import { canReuseHotelDisplayPrices, createHotelDisplayPrices } from "./hotelDetailCurrency";

test("Hotel detail snapshots retain Results currency and provider truth", () => {
  const provider = { pricePerNight: 210, totalPrice: 420, currency: "USD" };
  const snapshot = createHotelDisplayPrices(210, 420, "USD", "GBP", { USD: 1, GBP: 0.8 });
  assert.equal(snapshot.nightly?.formatted, "£168");
  assert.equal(snapshot.total?.formatted, "£336");
  assert.equal(canReuseHotelDisplayPrices({ snapshot, providerNightly: 210, providerTotal: 420, providerCurrency: "USD", displayCurrency: "GBP" }), true);
  assert.equal(canReuseHotelDisplayPrices({ snapshot, providerNightly: 210, providerTotal: 420, providerCurrency: "USD", preferredCurrency: "EUR" }), false);
  assert.deepEqual(provider, { pricePerNight: 210, totalPrice: 420, currency: "USD" });
});

test("Hotel detail missing rates truthfully retain provider currency", () => {
  const snapshot = createHotelDisplayPrices(210, 420, "USD", "NGN", { USD: 1 });
  assert.deepEqual({ formatted: snapshot.nightly?.formatted, currency: snapshot.nightly?.currency, converted: snapshot.nightly?.converted },
    { formatted: "$210", currency: "USD", converted: false });
});
