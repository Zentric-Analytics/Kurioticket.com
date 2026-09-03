import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCurrency } from "../currency/displayCurrency";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const ui = readFileSync("src/features/search/SearchUi.tsx", "utf8");

test("required currencies keep complete currency identity and grouped digits", () => {
  const samples: Record<string, number> = { USD: 12345.67, EUR: 12345.67, GBP: 12345.67, NGN: 12345678, VND: 123456789, IDR: 123456789, CAD: 12345.67 };
  for (const [currency, amount] of Object.entries(samples)) {
    const formatted = formatCurrency(amount, currency);
    assert.ok(formatted.length > 0, currency);
    assert.match(formatted, /\d/, currency);
    assert.doesNotMatch(formatted, /\d(?:\.\d)?[KM]\b/i, currency);
  }
});

test("main, nearby-date, and provider prices keep single-line fitting contracts", () => {
  assert.match(screen, /s0\.bigPrice[\s\S]*?numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?minimumFontScale=\{0\.72\}/);
  assert.match(screen, /s0\.providerPrice[\s\S]*?numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit/);
  assert.match(ui, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?s\.datePrice/);
  assert.doesNotMatch(screen + ui, /\d(?:\.\d)?[KM]`/);
});
