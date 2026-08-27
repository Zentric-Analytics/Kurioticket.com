import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSelectableCurrencyCodes } from "./currencySelectionModel";

test("selectable currencies intersect approved display currencies with usable provider rates", () => {
  const rates = {
    ABT: 1,
    ACH: 2,
    ADA: 3,
    AED: 3.67,
    EUR: 0.92,
    GBP: 0.79,
    NGN: 1500,
    USD: 1,
  };

  assert.deepEqual(getSelectableCurrencyCodes(rates), ["AED", "EUR", "GBP", "NGN", "USD"]);
});

test("selectable currencies exclude zero, negative, non-finite, and non-number rates", () => {
  const rates: Record<string, unknown> = {
    AED: 0,
    EUR: -0.92,
    GBP: Number.NaN,
    NGN: Number.POSITIVE_INFINITY,
    USD: "1",
    CAD: 1.36,
  };

  assert.deepEqual(getSelectableCurrencyCodes(rates), ["CAD"]);
});

test("selectable approved currency codes remain alphabetically sorted", () => {
  assert.deepEqual(getSelectableCurrencyCodes({ USD: 1, AED: 3.67, NGN: 1500, EUR: 0.92, GBP: 0.79 }), [
    "AED",
    "EUR",
    "GBP",
    "NGN",
    "USD",
  ]);
});

test("the existing Currency screen wires filtering to loading and saving only to a user press", () => {
  const screen = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");

  assert.match(screen, /setCurrencies\(getSelectableCurrencyCodes\(payload\.rates\)\)/);
  assert.match(screen, /const select = async \(currency: string\) =>[\s\S]*?await setCurrency\(currency\);/);
  assert.match(screen, /onPress=\{\(\) => void select\(currency\)\}/);
  assert.doesNotMatch(screen, /setCurrencies\(Object\.keys\(payload\.rates\)/);
});
