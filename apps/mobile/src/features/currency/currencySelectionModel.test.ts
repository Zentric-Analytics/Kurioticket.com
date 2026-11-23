import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  filterCurrencyPresentations,
  getCurrencyPresentation,
  getCurrencyPresentations,
  getSelectableCurrencyCodes,
} from "./currencySelectionModel";

test("common currencies use recognizable, disambiguated presentation symbols", () => {
  const expectedSymbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    JPY: "¥",
    BRL: "R$",
    CAD: "CA$",
    CNY: "CN¥",
    KES: "KSh",
    NZD: "NZ$",
  };

  for (const [code, symbol] of Object.entries(expectedSymbols)) {
    assert.equal(getCurrencyPresentation(code)?.symbol, symbol, code);
  }
});

test("currencies without an explicit symbol fall back to their ISO code", () => {
  assert.equal(getCurrencyPresentation("AFN")?.symbol, "AFN");
});

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
  const currencies = getCurrencyPresentations(["NGN", "USD", "CAD", "EUR", "INR", "CNY"]);

  assert.deepEqual(filterCurrencyPresentations(currencies, "NAI").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "ngn").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "₦").map(({ code }) => code), ["NGN"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "dollar").map(({ code }) => code), ["CAD", "USD"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "inr").map(({ code }) => code), ["INR"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "₹").map(({ code }) => code), ["INR"]);
  assert.deepEqual(filterCurrencyPresentations(currencies, "cn¥").map(({ code }) => code), ["CNY"]);
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
  assert.match(screen, /accessibilityLabel=\{`\$\{currency\.code\}, \$\{currency\.name\}`\}/);
  assert.match(screen, /accessibilityState=\{\{ checked: selected === currency\.code \}\}/);
});

test("Currency screen uses an unboxed text-first list and localized local search", () => {
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
  assert.doesNotMatch(currencyScreen, /currency\.symbol/);
  assert.doesNotMatch(currencyScreen, /styles\.currencySymbolColumn/);
  assert.doesNotMatch(currencyScreen, /styles\.currencySymbol/);
  assert.doesNotMatch(screen, /currencySymbolColumn:/);
  assert.doesNotMatch(screen, /currencySymbol:/);
  assert.match(screen, /currencyTrailing: \{ width: 30, flexShrink: 0/);
  assert.doesNotMatch(currencyScreen, />Save<|>Reset</);
  assert.equal(currencyScreen.match(/currencyRates\(\)/g)?.length, 1);
});

test("Currency rows match the Language list hierarchy and selected treatment", () => {
  const screen = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");
  const currencyScreen = screen.slice(screen.indexOf("export function CurrencyScreen"), screen.indexOf("const styles"));

  assert.doesNotMatch(currencyScreen, /currency\.symbol/);
  assert.doesNotMatch(currencyScreen, /styles\.currencySymbol(?:Column)?/);
  assert.match(currencyScreen, /styles\.currencyCode[^>]*>\{currency\.code\}<\/Text>/);
  assert.match(currencyScreen, /styles\.currencyName[^>]*>\{currency\.name\}<\/Text>/);
  assert.match(currencyScreen, /backgroundColor: theme\.priceAlertSurface/);
  assert.match(currencyScreen, /selected === currency\.code \? <FlowIcon name="check" color="#0754F7" \/> : null/);
  assert.match(currencyScreen, /style=\{\[styles\.currencyRow, \{ borderBottomColor: theme\.border \}/);
  assert.match(screen, /currencyRow: \{ minHeight: 74, paddingHorizontal: 16,[^}]*borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.match(screen, /currencyTextColumn: \{ flex: 1 \}/);
  assert.match(screen, /currencyCode: \{ fontSize: 16, fontWeight: "700" \}/);
  assert.match(screen, /currencyName: \{ fontSize: 14, lineHeight: 19, marginTop: 3 \}/);
  assert.doesNotMatch(currencyScreen, /styles\.card/);
  assert.doesNotMatch(currencyScreen, />Save<|>Reset</);
});
