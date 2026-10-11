import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  getCarDealPickerGroups,
  getCarProviderOfferGroups,
} from "@/lib/cars/carResults";
import type { CarOffer } from "@/lib/cars/types";

const picker = readFileSync(
  new URL("./CarDealPicker.tsx", import.meta.url),
  "utf8",
);
const mapPreview = readFileSync(
  new URL("./CarsResultsMapPreview.tsx", import.meta.url),
  "utf8",
);
const results = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

const offer = (
  id: string,
  provider: string,
  totalPrice: number,
  logo?: string,
): CarOffer => ({
  id,
  bookingProviderName: provider,
  bookingProviderLogoUrl: logo,
  rentalCompanyName: "Rental company",
  currency: "USD",
  pricePerDay: totalPrice / 2,
  totalPrice,
  taxesAndFeesIncluded: true,
  payAtPickup: false,
  freeCancellation: true,
  bookingUrl: `https://example.com/${id}`,
});

test("provider groups collapse duplicate sellers and keep each seller's cheapest offer first", () => {
  const groups = getCarProviderOfferGroups([
    offer("k-high", "Kurioticket", 320, "/brand/kurioticket-logo-primary-light-bg.svg"),
    offer("other", "Provider B", 290, "https://example.com/provider-b.svg"),
    offer("k-low", "Kurioticket", 278, "/brand/kurioticket-logo-primary-light-bg.svg"),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.providerName, "Kurioticket");
  assert.equal(groups[0]?.primaryOffer.id, "k-low");
  assert.deepEqual(groups[0]?.offers.map((item) => item.id), ["k-low", "k-high"]);
  assert.equal(groups[1]?.providerName, "Provider B");
});

test("provider groups normalize seller identity without inventing a provider", () => {
  const groups = getCarProviderOfferGroups([
    offer("a", " Provider B ", 300),
    offer("b", "provider b", 310),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.primaryOffer.id, "a");
});

test("static Kurioticket inventory exposes up to three real offer choices without inventing providers", () => {
  const groups = getCarDealPickerGroups({
    inventorySource: "kurioticket-static-cars",
    offers: [
      offer("k-278", "Kurioticket", 278, "/brand/kurioticket-logo-primary-light-bg.svg"),
      offer("k-292", "Kurioticket", 292, "/brand/kurioticket-logo-primary-light-bg.svg"),
      offer("k-306", "Kurioticket", 306, "/brand/kurioticket-logo-primary-light-bg.svg"),
    ],
  });

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.primaryOffer.id), [
    "k-278",
    "k-292",
    "k-306",
  ]);
  assert.ok(groups.every((group) => group.providerName === "Kurioticket"));
  assert.ok(groups.every((group) => group.offers.length === 1));
});

test("live or sandbox inventory keeps provider grouping instead of splitting one seller's offers", () => {
  const groups = getCarDealPickerGroups({
    inventorySource: "kayak-sandbox",
    offers: [
      offer("p-low", "Provider B", 278),
      offer("p-high", "Provider B", 292),
      offer("other", "Provider C", 306),
    ],
  });

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0]?.offers.map((item) => item.id), ["p-low", "p-high"]);
  assert.equal(groups[1]?.providerName, "Provider C");
});

test("provider picker exposes every supplied seller without a three-provider cutoff", () => {
  assert.match(picker, /getCarDealPickerGroups\(car\)/);
  assert.match(picker, /groups\.map\(\(group\) =>/);
  assert.doesNotMatch(picker, /groups\.slice\(/);
  assert.match(picker, /grid-cols-3 gap-y-3/);
  const groups = getCarDealPickerGroups({
    inventorySource: "kayak-sandbox",
    offers: Array.from({ length: 7 }, (_, index) => offer(String(index), `Seller ${index}`, 200 + index)),
  });
  assert.equal(groups.length, 7);
  assert.equal(new Set(groups.map((group) => group.providerName)).size, 7);
});

test("provider picker links each supplied seller directly through a validated booking URL", () => {
  assert.match(picker, /const offer = group\.primaryOffer/);
  assert.match(picker, /approvedProviderBookingUrl\(car, offer\)/);
  assert.match(picker, /sandboxBookingUrl\(offer\.bookingUrl\)/);
  assert.match(picker, /url\.protocol !== "https:" \|\| url\.username \|\| url\.password/);
  assert.match(picker, /href=\{bookingHref\}/);
  assert.match(picker, /rel="noopener noreferrer"/);
  assert.match(picker, /aria-disabled="true"/);
  assert.doesNotMatch(
    picker,
    /Provider handoff will appear when this seller supplies a booking link\./,
  );
});

test("inline provider choices show an explicitly labelled converted daily price", () => {
  assert.doesNotMatch(picker, />\s*Price\s*</);
  assert.match(picker, /amount: offer\.pricePerDay/);
  assert.match(picker, /sourceCurrency: offer\.currency/);
  assert.match(picker, /displayCurrency: selectedOption\.currency/);
  assert.match(picker, /rates: currencyRates\.rates/);
  assert.match(picker, /\{formatOfferPrice\(offer\)\}/);
  assert.match(picker, />\/day<\/span>/);
  assert.doesNotMatch(picker, /1 available offer|available offers · best rate selected/);
  assert.doesNotMatch(picker, /Selected · View deal uses this provider/);
  assert.doesNotMatch(picker, /Choose this provider to update View deal/);
  assert.match(picker, /data-car-deal-provider-price/);
  assert.match(picker, /event\.stopPropagation\(\)/);
});

test("Cars results map mirrors the Hotels-style filter-rail interaction", () => {
  assert.match(results, /<CarsResultsMapPreview location=\{search\.pickupLocation\} \/>/);
  assert.match(results, /<aside[\s\S]*?<CarsResultsMapPreview[\s\S]*?<CarFilters/);
  assert.match(mapPreview, /data-cars-results-map-preview/);
  assert.match(mapPreview, /dialogRef\.current\?\.showModal\(\)/);
  assert.match(mapPreview, /document\.body\.style\.position = "fixed"/);
  assert.match(mapPreview, /window\.scrollTo\(0, lockedScrollYRef\.current\)/);
  assert.match(mapPreview, /Show on map/);
});

test("standalone normalized cars share one result-card contract", () => {
  assert.doesNotMatch(results, /<KayakResultCard/);
  assert.match(results, /visibleResults\.map\(\(car\) => \([\s\S]*?<CarResultCard/);
  assert.doesNotMatch(results, /providerLabel=[^\n]*KAYAK sandbox/);
});
