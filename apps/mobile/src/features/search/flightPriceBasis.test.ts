import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPrice } from "../currency/displayCurrency";
import { flightPriceBasis, flightProviderFarePresentation } from "./flightPriceBasis";

const basis = (params: Record<string, string>, fare?: DisplayPrice) => flightPriceBasis(params, fare);

test("summarizes canonical passenger breakdown and trip types", () => {
  assert.equal(basis({ adults: "1", children: "0", infants: "0", tripType: "round-trip" }).summary, "1 traveler · Round-trip");
  assert.equal(basis({ adults: "2", children: "1", infants: "1", tripType: "round-trip" }).summary, "4 travelers · Round-trip");
  assert.equal(basis({ adults: "1", children: "0", infants: "0", tripType: "one-way" }).summary, "1 traveler · One-way");
  assert.equal(basis({ adults: "2", children: "1", infants: "0", tripType: "multi-city" }).summary, "3 travelers · Multi-city");
});

test("uses the legacy traveler fallback with singular grammar", () => {
  assert.equal(basis({ travelers: "2", tripType: "round-trip" }).travelerLabel, "2 travelers");
  assert.equal(basis({ travelers: "1", tripType: "round-trip" }).travelerLabel, "1 traveler");
});

test("invalid counts safely use the canonical default", () => {
  for (const travelers of ["bad", "NaN", "0", "-3"]) {
    const result = basis({ travelers, tripType: "round-trip" });
    assert.equal(result.travelerLabel, "1 traveler");
    assert.doesNotMatch(result.summary, /NaN|0 travelers|-3 travelers/);
  }
});

test("discloses a valid converted provider fare only", () => {
  const converted: DisplayPrice = { amount: 670000, currency: "NGN", formatted: "₦670,000", accessibilityLabel: "670,000 naira", providerAmount: 420, providerCurrency: "USD", converted: true };
  assert.equal(basis({ travelers: "4" }, converted).providerFareText, "Provider fare $420");
  assert.match(basis({ travelers: "4" }, converted).providerFareAccessibilityText!, /Provider fare.*US dollar/i);
  assert.equal(basis({ travelers: "4" }, { ...converted, currency: "USD", formatted: "$420", converted: false }).providerFareText, null);
  assert.equal(basis({ travelers: "4" }, { ...converted, providerAmount: Number.NaN }).providerFareText, null);
});

test("presents authoritative converted provider fares with explicit ISO identity", () => {
  const converted: DisplayPrice = { amount: 670000, currency: "NGN", formatted: "₦670,000", accessibilityLabel: "670,000 Nigerian naira", providerAmount: 420, providerCurrency: "USD", converted: true };
  for (const [currency, formatted, accessibilityCurrency] of [
    ["USD", "$420", /US dollars?/i],
    ["AUD", "$420", /Australian dollars?/i],
    ["CAD", "$420", /Canadian dollars?/i],
    ["GBP", "£420", /British pounds?/i],
  ] as const) {
    const presentation = flightProviderFarePresentation({ ...converted, providerCurrency: currency });
    assert.equal(presentation?.formatted, formatted);
    assert.equal(presentation?.currency, currency);
    assert.match(presentation?.accessibilityLabel ?? "", accessibilityCurrency);
  }
});

test("rejects unconverted and malformed provider fares", () => {
  const converted: DisplayPrice = { amount: 670000, currency: "NGN", formatted: "₦670,000", accessibilityLabel: "670,000 Nigerian naira", providerAmount: 420, providerCurrency: "USD", converted: true };
  assert.equal(flightProviderFarePresentation({ ...converted, converted: false }), null);
  assert.equal(flightProviderFarePresentation({ ...converted, providerAmount: Number.POSITIVE_INFINITY }), null);
  assert.equal(flightProviderFarePresentation({ ...converted, providerCurrency: "usd" }), null);
  assert.equal(flightProviderFarePresentation({ ...converted, providerCurrency: "US" }), null);
});

test("preserves the provider offer total without per-traveler arithmetic", () => {
  const fare: DisplayPrice = { amount: 800000, currency: "NGN", formatted: "₦800,000", accessibilityLabel: "800,000 naira", providerAmount: 800000, providerCurrency: "NGN", converted: false };
  assert.equal(basis({ travelers: "4" }, fare).travelerCount, 4);
  assert.equal(fare.formatted, "₦800,000");
});
