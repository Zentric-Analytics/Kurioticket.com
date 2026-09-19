import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { FlightDetailsFareChoice } from "../../../../../src/lib/flights/flightDetailsContract";
import { nativeFlightDealSelection } from "./nativeFlightDealSelection";

const source = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
const choice = (offerId: string, deals: Array<{ key: string; offerId: string; providerName: string; price: number }>) => ({
  key: `fare-${offerId}`,
  label: "Economy",
  offer: { id: offerId },
  selectedOffer: true,
  handoff: { available: true, providerName: "Airline" },
  distinguishingTerms: [],
  deals: deals.map((deal) => ({ ...deal, currency: "NGN" })),
}) as unknown as FlightDetailsFareChoice;

const economy = choice("A", [
  { key: "alaska", offerId: "A", providerName: "Alaska Airlines", price: 434_490 },
  { key: "mytrip", offerId: "B", providerName: "Mytrip", price: 875_833 },
]);
const first = choice("C", [
  { key: "first-airline", offerId: "C", providerName: "Airline", price: 1_100_000 },
  { key: "first-agency", offerId: "D", providerName: "Agency", price: 1_200_000 },
]);

test("authoritative fare offer determines the initial deal without relying on price order", () => {
  const reordered = choice("B", [...economy.deals].reverse());
  assert.equal(nativeFlightDealSelection(null, reordered)?.offerId, "B");
});

test("an explicit higher-priced seller remains selected", () => {
  const selected = nativeFlightDealSelection("B", economy);
  assert.equal(selected?.providerName, "Mytrip");
  assert.equal(selected?.price, 875_833);
  assert.equal(selected?.offerId, "B");
});

test("changing fares reconciles stale selection to the new authoritative deal", () => {
  assert.equal(nativeFlightDealSelection("B", first)?.offerId, "C");
});

test("a sole provider is selected without requiring invented provider data", () => {
  const single = choice("ONLY", [{ key: "only", offerId: "ONLY", providerName: "Seller", price: 500 }]);
  assert.deepEqual(nativeFlightDealSelection(null, single), single.deals[0]);
});

test("Compare deals uses selectable cards and one dock handoff", () => {
  assert.match(source, /accessibilityRole="radiogroup" accessibilityLabel="Flight deal options"/);
  assert.match(source, /accessibilityRole="radio" accessibilityState=\{\{selected:isSelected\}\}/);
  assert.match(source, /borderColor:isSelected\?ui\.blue:surfaceBorderColor/);
  assert.doesNotMatch(source, /View deal|viewDealAction|s\.dealRow/);
  assert.match(source, /displayPrices\[`deal:\$\{selectedDeal\.key\}`\]/);
  assert.match(source, /booking\?"Checking offer…":"Continue deal"/);
  assert.match(source, /handoff\(selectedDeal\?\.offerId\?\?offer\.id\)/);
});
