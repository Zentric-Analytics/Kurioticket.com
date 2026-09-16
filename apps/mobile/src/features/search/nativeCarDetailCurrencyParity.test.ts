import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { CarResult } from "../../api/travelApi";
import { formatCurrency, formatMarketCurrency } from "../currency/displayCurrency";
import { presentCarOfferCurrency } from "./carDisplayCurrency";

const approved = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const kayak = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");

const providerOffer: CarResult["offers"][number] = {
  id: "currency-detail-offer",
  bookingProviderName: "Provider",
  rentalCompanyName: "Rental Co",
  currency: "USD",
  pricePerDay: 50,
  totalPrice: 100,
  taxesAndFeesIncluded: true,
  payAtPickup: false,
  freeCancellation: true,
  bookingUrl: "https://example.com/car",
};

test("approved and KAYAK Cars details consume the canonical reactive display currency", () => {
  for (const source of [approved, kayak]) {
    assert.match(source, /useCarDisplayCurrency\(\)/);
    assert.match(source, /const \{ displayCurrency, rates \} = useCarDisplayCurrency\(\)/);
    assert.match(source, /comparisonCarOffers\(result\.offers\)/);
    assert.match(source, /providerOffers\.map\(\(candidate\) => presentCarOfferCurrency\(candidate, displayCurrency, rates\)\)|providerOffers\.map\(candidate => presentCarOfferCurrency\(candidate, displayCurrency, rates\)\)/);
    assert.match(source, /primaryValidCarOffer\(result\.offers\)/);
    assert.match(source, /presentCarOfferCurrency\(providerPrimaryOffer, displayCurrency, rates\)/);
    assert.match(source, /offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)|offers\.find\(candidate => candidate\.id === selectedOfferId\)/);
    assert.match(source, /formatMarketCurrency\(offer\.(?:totalPrice|pricePerDay),\s*offer\.currency\)/);
  }
});

test("Cars detail conversion supports selected currencies without mutating provider truth", () => {
  const naira = presentCarOfferCurrency(providerOffer, "NGN", { USD: 1, NGN: 1500 });
  assert.notEqual(naira, providerOffer);
  assert.equal(naira.currency, "NGN");
  assert.equal(naira.pricePerDay, 75000);
  assert.equal(naira.totalPrice, 150000);

  const cad = presentCarOfferCurrency(providerOffer, "CAD", { USD: 1, CAD: 1.35 });
  assert.equal(cad.currency, "CAD");
  assert.equal(cad.pricePerDay, 67.5);
  assert.equal(cad.totalPrice, 135);

  assert.equal(providerOffer.currency, "USD");
  assert.equal(providerOffer.pricePerDay, 50);
  assert.equal(providerOffer.totalPrice, 100);
});

test("Cars detail price formatters use currency marks instead of NGN, USD, or CAD text", () => {
  assert.equal(formatCurrency(100, "NGN"), "₦100");
  assert.equal(formatCurrency(100, "USD"), "$100");
  assert.equal(formatMarketCurrency(100, "NGN"), "₦100.00");
  assert.equal(formatMarketCurrency(100, "USD"), "$100.00");
  assert.equal(formatMarketCurrency(100, "CAD"), "CA$100.00");
  assert.equal(formatMarketCurrency(100, "AUD"), "A$100.00");
  assert.equal(formatMarketCurrency(100, "GBP"), "£100.00");
  assert.equal(formatMarketCurrency(100, "EUR"), "€100.00");
  assert.equal(formatMarketCurrency(100, "JPY"), "¥100");
});

test("long converted Cars detail prices shrink within their existing card and dock columns", () => {
  for (const source of [approved, kayak]) {
    assert.match(source, /comparePrice:\s*\{[^}]*flexShrink:\s*1[^}]*minWidth:\s*72[^}]*maxWidth:\s*"42%"/);
    assert.match(source, /daily:\s*\{[^}]*maxWidth:\s*"100%"/);
    assert.match(source, /numberOfLines=\{1\}\s+adjustsFontSizeToFit\s+minimumFontScale=\{0\.68\}\s+style=\{\[s\.daily/);
    assert.match(source, /dockTotal:\s*\{[^}]*maxWidth:\s*"100%"/);
    assert.match(source, /numberOfLines=\{1\}\s+adjustsFontSizeToFit\s+minimumFontScale=\{0\.65\}\s+style=\{\[s\.dockTotal/);
  }
});
