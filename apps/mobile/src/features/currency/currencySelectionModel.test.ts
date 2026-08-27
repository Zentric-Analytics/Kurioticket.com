import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  filterCurrencyPresentations,
  getCurrencyPresentations,
  getSelectableCurrencyCodes,
} from "./currencySelectionModel";

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

test("currency presentations provide readable names and sort by human-readable name", () => {
  assert.deepEqual(getCurrencyPresentations(["NGN", "USD", "EUR", "GBP", "AED"]), [
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "AED", name: "United Arab Emirates Dirham", symbol: "AED" },
    { code: "USD", name: "US Dollar", symbol: "$" },
  ]);
});

test("currency search matches name, ISO code, and symbol case-insensitively", () => {
  const currencies = getCurrencyPresentations(["NGN", "USD", "CAD", "EUR", "INR"]);

  assert.deepEqual(filterCurrencyPresentations(currencies, "NAI").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "ngn").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "₦").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "dollar").map(({ code }) => code), ["CAD", "USD"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "inr").map(({ code }) => code), ["INR"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "not a currency"), []);

  const model = readFileSync("src/features/currency/currencySelectionModel.ts", "utf8");
  assert.doesNotMatch(model, /toLocaleLowerCase/);
});

test("the existing Currency screen wires filtering to loading and saving only to a user press", () => {
  const screen = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");

  assert.match(screen, /setCurrencies\(getSelectableCurrencyCodes\(payload\.rates\)\)/);
  assert.match(screen, /const select = async \(currency: string\) =>[\s\S]*?await setCurrency\(currency\);/);
  assert.match(screen, /onPress=\{\(\) => void select\(currency\.code\)\}/);
  assert.doesNotMatch(screen, /setCurrencies\(Object\.keys\(payload\.rates\)/);
  assert.match(screen, /accessibilityLabel=\{`\$\{currency\.name\}, \$\{currency\.code\}`\}/);
  assert.match(screen, /accessibilityState=\{\{ checked: selected === currency\.code \}\}/);
});

test("Currency screen uses an unboxed three-column list and localized local search", () => {
  const screen = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");
  const catalog = readFileSync("src/localization/mobileLocalizationCatalog.ts", "utf8");
  const currencyScreen = screen.slice(screen.indexOf("export function CurrencyScreen"), screen.indexOf("const styles"));

  assert.doesNotMatch(currencyScreen, /styles\.card/);
  assert.match(currencyScreen, /const currencySearch = t\("currencySearch"\)/);
  assert.match(currencyScreen, /placeholder=\{currencySearch\}/);
  assert.match(currencyScreen, /\{t\("currencyEmpty"\)\}/);
  assert.match(catalog, /currencySearch:"Search currencies"/);
  assert.match(catalog, /currencyEmpty:"No currencies found\."/);
  assert.match(catalog, /currencySearch:"Buscar monedas"/);
  assert.match(catalog, /currencyEmpty:"No se encontraron monedas\."/);
  assert.match(screen, /currencySymbolColumn: \{ width: 54, flexShrink: 0/);
  assert.match(screen, /currencyTrailing: \{ width: 28, flexShrink: 0/);
  assert.doesNotMatch(currencyScreen, />Save<|>Reset</);
  assert.equal(currencyScreen.match(/currencyRates\(\)/g)?.length, 1);
});
