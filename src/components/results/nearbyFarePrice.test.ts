import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatCurrency, formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { nearbyFarePrice } from "./nearbyFarePrice";

test("desktop nearby fares preserve ordinary prices and seven-digit symbol amounts", () => {
  for (const [currency, amount] of [["USD", 196.37], ["USD", 6039.76], ["EUR", 6039.76], ["GBP", 6039.76], ["JPY", 1234567], ["NGN", 1234567]] as const) {
    const formatted = currency === "NGN" ? "₦1,234,567" : formatCurrency(amount, currency);
    const result = nearbyFarePrice({ amount, currency, formatted }, "en-US");
    assert.equal(result.formatted, formatted);
    assert.equal(result.full, formatted);
    assert.doesNotMatch(result.formatted, /…|\.\.\./);
  }
});

test("exceptionally long prices use locale-aware compact notation with the full amount retained", () => {
  for (const locale of ["en-US", "de-DE", "ar-EG"]) {
    const price = Object.freeze({ amount: 123456789.25, currency: "NGN", formatted: new Intl.NumberFormat(locale, { style: "currency", currency: "NGN" }).format(123456789.25) });
    const result = nearbyFarePrice(price, locale);
    assert.equal(result.full, price.formatted);
    assert.equal(result.formatted, new Intl.NumberFormat(locale, { style: "currency", currency: "NGN", notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(price.amount));
    assert.equal(price.amount, 123456789.25);
  }
});

test("nearby presentation consumes the existing converted display price without changing its currency", () => {
  const price = formatDisplayPrice({ amount: 196.37, sourceCurrency: "USD", displayCurrency: "NGN", convertUsdEstimate: true });
  const original = structuredClone(price);
  assert.equal(nearbyFarePrice(price, "en-US").full, price.formatted);
  assert.deepEqual(price, original);
});

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const desktop = css.split("/* Standalone desktop polish.")[1].split("/* Cars desktop pickers")[0];

test("compact rules are desktop-only, standalone-scoped, and content-driven", () => {
  assert.match(desktop, /@media \(min-width: 1024px\)/);
  for (const rule of desktop.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (rule[1].includes(".flight-card-")) {
      assert.match(rule[1], /\.flight-results-grid/);
      if (!/logo|view-button/.test(rule[1])) assert.doesNotMatch(rule[2], /(?:^|;)\s*(?:min-|max-)?height:/);
    }
  }
  assert.match(desktop, /font-size: 1\.1875rem/);
  assert.match(desktop, /minmax\(1\.5rem, auto\)/);
  assert.match(desktop, /min-height: 44px/);
  assert.match(desktop, /padding: 0\.75rem 1rem/);
});

test("desktop fare geometry preserves seven dates and complete price accessibility", () => {
  assert.match(desktop, /44px repeat\(7, minmax\(0, 1fr\)\) 44px/);
  assert.match(desktop, /min-height: 74px/);
  assert.match(desktop, /font-variant-numeric: tabular-nums/);
  assert.doesNotMatch(desktop, /text-overflow|overflow:\s*hidden/);
  assert.match(source, /aria-label=\{desktopPrice\?\.full\}/);
  assert.match(source, /title=\{desktopPrice\?\.full\}/);
  assert.match(source, /desktop-flight-fare-price hidden lg:block/);
  assert.match(source, /navigateNearbyFareWindow\("previous"\)/);
  assert.match(source, /navigateNearbyFareWindow\("next"\)/);
});
