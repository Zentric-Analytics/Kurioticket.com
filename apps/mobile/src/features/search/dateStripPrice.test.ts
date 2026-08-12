import assert from "node:assert/strict";
import test from "node:test";
import { displayPrice } from "../currency/displayCurrency";
import { formatDateStripPrice } from "./dateStripPrice";

const format = (amount: number, currency: string) =>
  formatDateStripPrice(displayPrice(amount, currency, currency, {}));

test("keeps naturally fitting DateStrip fares at full precision", () => {
  const price = format(89_482, "NGN");
  assert.match(price.formatted, /89,482/);
  assert.doesNotMatch(price.formatted, /[KM]/);
});

test("compacts DateStrip thousands without changing the resolved fare", () => {
  assert.match(format(827_413, "NGN").formatted, /827K/);
  assert.match(format(888_336, "NGN").formatted, /888K/);
});

test("uses useful, non-padded precision for DateStrip millions", () => {
  assert.match(format(1_744_924, "NGN").formatted, /1\.74M/);
  assert.match(format(10_500_000, "NGN").formatted, /10\.5M/);
  assert.match(format(125_000_000, "NGN").formatted, /125M/);
});

test("compact formatting works independently of the display currency", () => {
  for (const currency of ["USD", "GBP", "EUR"]) {
    const price = format(1_744_924, currency);
    assert.match(price.formatted, /1\.74M/);
    assert.match(price.accessibilityLabel, /1,744,924/);
  }
});
