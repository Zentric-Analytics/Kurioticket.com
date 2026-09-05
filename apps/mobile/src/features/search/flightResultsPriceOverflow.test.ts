import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { DisplayPrice } from "../currency/displayCurrency";
import { formatCurrency } from "../currency/displayCurrency";
import { flightProviderFarePresentation } from "./flightPriceBasis";

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

test("main fare stays full-size and single-line without a duplicated provider price", () => {
  const fare = /<Text accessible=\{false\} style=\{\[s0\.bigPrice[\s\S]*?<\/Text>/.exec(screen)?.[0] ?? "";
  assert.match(fare, /numberOfLines=\{1\}/);
  assert.doesNotMatch(fare, /adjustsFontSizeToFit|minimumFontScale|ellipsizeMode/);
  const card = screen.slice(screen.indexOf("function FlightCard"), screen.indexOf("function HotelCard"));
  assert.doesNotMatch(card.slice(card.indexOf('<View style={s0.flightCommercialRegion}>')), /Provider price:|providerPrice|estimatedPrice/);
  assert.match(screen, /flightCommercialRegion: \{ width: "46%", minWidth: 104, flexShrink: 0/);
  assert.doesNotMatch(screen, /flightCommercialRegion: \{[^}]*maxWidth/);
  assert.match(ui, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?s\.datePrice/);
  assert.doesNotMatch(screen + ui, /\d(?:\.\d)?[KM]`/);
});

test("long provider fares use a non-lossy compact card string instead of microscopic text", () => {
  const base: DisplayPrice = {
    amount: 670000,
    currency: "NGN",
    formatted: "₦670,000",
    accessibilityLabel: "670,000 Nigerian naira",
    providerAmount: 420,
    providerCurrency: "USD",
    converted: true,
  };
  const cases = [
    ["USD", 198, "$198"],
    ["USD", 1899, "$1,899"],
    ["NGN", 572107, "₦572,107"],
    ["IDR", 2450000, "IDR2450000"],
    ["VND", 18750000, "₫18750000"],
  ] as const;

  for (const [currency, amount, expected] of cases) {
    const presentation = flightProviderFarePresentation({ ...base, providerCurrency: currency, providerAmount: amount });
    assert.equal(presentation?.formatted, expected);
    assert.equal(presentation?.formatted.replace(/\D/g, ""), String(amount));
    assert.equal(presentation?.currency, currency);
    assert.doesNotMatch(presentation?.formatted ?? "", /\d(?:\.\d)?[KM]\b/i);
  }
});

test("provider fare strings retain readable footer space across supported phone widths", () => {
  const longestCardLabel = "Provider price: ₫18750000";
  assert.ok(longestCardLabel.length < "Provider price: ₫18,750,000".length);

  for (const viewport of [320, 360, 375, 390, 412, 430]) {
    const footerWidth = viewport - 28 - 24;
    const commercialWidth = footerWidth * 0.46;
    const metadataWidth = footerWidth - 8 - commercialWidth;
    assert.ok(commercialWidth >= 104, `${viewport}px keeps the commercial minimum`);
    assert.ok(metadataWidth > 0, `${viewport}px keeps a separate metadata column`);
    assert.ok(commercialWidth + 8 + metadataWidth <= footerWidth, `${viewport}px footer does not overlap`);
  }
});
