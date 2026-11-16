import assert from "node:assert/strict";
import test from "node:test";
import type { HotelResult } from "../../api/travelApi";
import { hotelVisiblePrices } from "./hotelVisiblePrices";

const hotel = (id: string, amount = 100) => ({ id, pricePerNight: amount, totalPrice: amount * 7, currency: "USD" }) as HotelResult;

test("large progressive inventory does no price-presentation work outside the reveal window", () => {
  const visible = Array.from({ length: 24 }, (_, index) => hotel(String(index)));
  const hidden = Array.from({ length: 20_000 }, (_, index) => ({
    id: `hidden-${index}`,
    get pricePerNight(): number { throw new Error("Unrevealed price must not be formatted"); },
  } as HotelResult));
  const inventory = [...visible, ...hidden];
  const prices = hotelVisiblePrices(inventory, 24, "USD", {});
  assert.equal(prices.size, 24);
  assert.equal(prices.get("0")?.nightly?.amount, 100);
  assert.equal(prices.has("hidden-0"), false);
  assert.equal(inventory.length, 20_024);
});

test("revealing, reordering and changing currency produce prices for the current visible hotels", () => {
  const inventory = [hotel("first"), hotel("second", 200), hotel("third", 300)];
  assert.deepEqual([...hotelVisiblePrices(inventory, 1, "USD", {}).keys()], ["first"]);
  assert.deepEqual([...hotelVisiblePrices(inventory, 2, "USD", {}).keys()], ["first", "second"]);
  const reordered = hotelVisiblePrices([...inventory].reverse(), 1, "GBP", { USD: 1, GBP: 0.8 });
  assert.deepEqual([...reordered.keys()], ["third"]);
  assert.equal(reordered.get("third")?.nightly?.amount, 240);
  assert.equal(reordered.get("third")?.total?.amount, 1680);
  assert.equal(reordered.get("third")?.nightly?.currency, "GBP");
  assert.equal(hotelVisiblePrices(inventory, 0, "USD", {}).size, 0);
});
