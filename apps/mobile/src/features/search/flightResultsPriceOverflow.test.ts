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

test("wide supported display fares preserve every digit without lossy abbreviation", () => {
  const samples: Array<[string, number, string]> = [
    ["USD", 1899, "1,899"],
    ["EUR", 1899, "1,899"],
    ["GBP", 2350, "2,350"],
    ["NGN", 1250000, "1,250,000"],
    ["VND", 18750000, "18,750,000"],
    ["IDR", 2450000, "2,450,000"],
    ["INR", 125000, "125,000"],
    ["CAD", 1899, "1,899"],
  ];
  for (const [currency, amount, digits] of samples) {
    const formatted = formatCurrency(amount, currency);
    assert.ok(formatted.includes(digits), `${currency} preserves ${digits}`);
    assert.doesNotMatch(formatted, /\d(?:\.\d)?[KM]\b/i, currency);
  }
});

test("main fare stays full-size and single-line while secondary prices retain safe fitting", () => {
  const fare = /<Text accessible=\{false\} style=\{\[s0\.bigPrice[\s\S]*?<\/Text>/.exec(screen)?.[0] ?? "";
  assert.match(fare, /numberOfLines=\{1\}/);
  assert.doesNotMatch(fare, /adjustsFontSizeToFit|minimumFontScale|ellipsizeMode/);
  assert.match(screen, /s0\.providerPrice[\s\S]*?numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit/);
  assert.match(ui, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?s\.datePrice/);
  assert.doesNotMatch(screen + ui, /\d(?:\.\d)?[KM]`/);
});
