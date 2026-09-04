import assert from "node:assert/strict";
import test from "node:test";
import { canReuseHotelDisplayPrices, createHotelDisplayPrices, createHotelRoomDisplayPrice } from "./hotelDetailCurrency";

test("Hotel detail snapshots retain Results currency and provider truth", () => {
  const provider = { pricePerNight: 210, totalPrice: 420, currency: "USD" };
  const snapshot = createHotelDisplayPrices(210, 420, "USD", "GBP", { USD: 1, GBP: 0.8 });
  assert.equal(snapshot.nightly?.formatted, "£168.00");
  assert.equal(snapshot.total?.formatted, "£336.00");
  assert.equal(canReuseHotelDisplayPrices({ snapshot, providerNightly: 210, providerTotal: 420, providerCurrency: "USD", displayCurrency: "GBP" }), true);
  assert.equal(canReuseHotelDisplayPrices({ snapshot, providerNightly: 210, providerTotal: 420, providerCurrency: "USD", preferredCurrency: "EUR" }), false);
  assert.deepEqual(provider, { pricePerNight: 210, totalPrice: 420, currency: "USD" });
});

test("Hotel detail missing rates truthfully retain provider currency", () => {
  const snapshot = createHotelDisplayPrices(210, 420, "USD", "NGN", { USD: 1 });
  assert.deepEqual({ formatted: snapshot.nightly?.formatted, currency: snapshot.nightly?.currency, converted: snapshot.nightly?.converted },
    { formatted: "$210.00", currency: "USD", converted: false });
});

test("room options use the surrounding two-decimal display currency", () => {
  const price = createHotelRoomDisplayPrice(210, 630, "USD", "NGN", { USD: 1, NGN: 1371.63 });
  assert.equal(price?.nightly.formatted, "₦288,042.30");
  assert.equal(price?.total.formatted, "₦864,126.90");
  assert.equal(price?.nightly.currency, "NGN");
  assert.match(price?.nightly.accessibilityLabel ?? "", /Nigerian nairas?/i);
});

test("room options retain same currency and Hotel market precision", () => {
  assert.equal(createHotelRoomDisplayPrice(12.5, 25, "USD", "USD", {})?.nightly.formatted, "$12.50");
  assert.equal(createHotelRoomDisplayPrice(210, 630, "USD", "JPY", { USD: 1, JPY: 150 })?.nightly.formatted, "¥31,500");
  assert.equal(createHotelRoomDisplayPrice(10, 20, "CAD", "CAD", {})?.nightly.formatted, "CA$10.00");
});

test("room options never fall back to a mixed source currency", () => {
  assert.equal(createHotelRoomDisplayPrice(210, 630, "USD", "NGN", { USD: 1 }), null);
  assert.equal(createHotelRoomDisplayPrice(210, 630, "USD", "NGN", { USD: 0, NGN: 1000 }), null);
});
