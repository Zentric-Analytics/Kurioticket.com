import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { getCarProviderOfferGroups } from "@/lib/cars/carResults";
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

test("provider picker is capped at three visible sellers with an overflow control", () => {
  assert.match(picker, /groups\.slice\(0, 3\)/);
  assert.match(picker, /extraCount > 0/);
  assert.match(picker, /\+\{extraCount\}/);
  assert.match(picker, /Compare providers/);
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
  assert.match(results, /KAYAK sandbox · Simulated offer/);
});
