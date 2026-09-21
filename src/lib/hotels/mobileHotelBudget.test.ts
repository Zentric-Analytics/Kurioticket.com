import assert from "node:assert/strict";
import test from "node:test";
import { createMobileHotelBudget } from "./mobileHotelBudget";

test("mobile budget edits the same NGN amount that is displayed while filtering in USD", () => {
  const budget = createMobileHotelBudget("NGN", { USD: 1, NGN: 1372.63 });
  assert.equal(budget.toDisplay(7700), 10569251);
  assert.equal(budget.toUsd(10569251), 7700);
  assert.equal(budget.toUsd(137263), 100);
});

test("missing currency rates fall back to USD and invalid values cannot poison filters", () => {
  const budget = createMobileHotelBudget("NGN", { USD: 1 });
  assert.equal(budget.currency, "USD");
  assert.equal(budget.toDisplay(500), 500);
  assert.equal(budget.toUsd(Number.NaN), 0);
  assert.equal(budget.toUsd(-10), 0);
});
