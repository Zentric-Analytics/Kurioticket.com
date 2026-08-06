import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import { createDefaultDealsSearch, type DealsSearch } from "./dealsSearchParams";
import { areDealsCarSelectionsMateriallyEqual, buildDealsCarDetailsSelection, buildDealsCarInternalDetailsPath, getEffectiveDealsCarDetailsId, isCurrentDealsCarDetailsResponse } from "./dealsCarDetails";

const search: DealsSearch = { ...createDefaultDealsSearch(), mode: "hotel-car", hotelDestination: "Paris", hotelCheckIn: "2026-09-10", hotelCheckOut: "2026-09-12", carPickupLocation: "CDG", carReturnToDifferentLocation: true, carReturnLocation: "ORY", carPickupDate: "2026-09-10", carPickupTime: "10:00", carReturnDate: "2026-09-12", carReturnTime: "09:00", carDriverAge: "35" };
const car: NormalizedCarResult = { id: "car-a", category: "compact", categoryLabel: "Compact", modelName: "Toyota Corolla", orSimilar: true, imageAlt: "Toyota", passengers: 5, bags: 2, doors: 4, transmission: "automatic", airConditioning: true, fuelPolicy: "full-to-full", mileagePolicy: "unlimited", pickupType: "airport-counter", pickupLocation: "CDG Terminal", returnLocation: "ORY Terminal", shuttleRequired: false, rentalCompanyName: "Acme Cars", recommendationScore: 1, requiredDocuments: [], includedItems: [], importantInformation: [], offers: [{ id: "offer-1", bookingProviderName: "Partner", rentalCompanyName: "Acme Cars", currency: "USD", pricePerDay: 50, totalPrice: 100, taxesAndFeesIncluded: true, payAtPickup: false, freeCancellation: true }], inventorySource: "kurioticket-static-cars" };

test("effective ID prefers valid transient, falls back, and rejects invalid IDs", () => { assert.equal(getEffectiveDealsCarDetailsId(" car-b ", "car-a"), "car-b"); assert.equal(getEffectiveDealsCarDetailsId(null, "car-a"), "car-a"); assert.equal(getEffectiveDealsCarDetailsId("", "\u0000"), null); });
test("current response accepts exact normalized ID and rejects mismatches", () => { assert.equal(isCurrentDealsCarDetailsResponse("car-a", car), true); assert.equal(isCurrentDealsCarDetailsResponse("car-b", car), false); });
test("selection maps canonical fields and provider fallback", () => { const selection = buildDealsCarDetailsSelection({ car, requestedCarId: "car-a", search, resultReceivedAt: 123 }); assert(selection); assert.equal(selection.id, "car-a"); assert.equal(selection.provider, "Partner"); assert.equal(selection.rentalCompany, "Acme Cars"); assert.equal(selection.modelName, "Toyota Corolla"); assert.equal(selection.categoryLabel, "Compact"); assert.equal(selection.pickupLocation, "CDG Terminal"); assert.equal(selection.returnLocation, "ORY Terminal"); assert.equal(selection.pickupDate, "2026-09-10"); assert.equal(selection.pickupTime, "10:00"); assert.equal(selection.dropoffDate, "2026-09-12"); assert.equal(selection.dropoffTime, "09:00"); assert.equal(selection.sourcePrice, 100); assert.equal(selection.sourceCurrency, "USD"); assert.equal(selection.resultReceivedAt, 123); assert.equal(selection.detailsPath, buildDealsCarInternalDetailsPath("car-a", search)); const fallback = buildDealsCarDetailsSelection({ car: { ...car, offers: [{ ...car.offers[0]!, bookingProviderName: " " }] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }); assert.equal(fallback?.provider, "Acme Cars"); });
test("selection rejects invalid required data", () => { assert.equal(buildDealsCarDetailsSelection({ car: { ...car, rentalCompanyName: " ", offers: [{ ...car.offers[0]!, bookingProviderName: " " }] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null); assert.equal(buildDealsCarDetailsSelection({ car: { ...car, offers: [] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null); for (const totalPrice of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) assert.equal(buildDealsCarDetailsSelection({ car: { ...car, offers: [{ ...car.offers[0]!, totalPrice }] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null); assert.equal(buildDealsCarDetailsSelection({ car, requestedCarId: "car-b", search, resultReceivedAt: 123 }), null); assert.equal(buildDealsCarDetailsSelection({ car, requestedCarId: "car-a", search: { ...search, carPickupDate: "" }, resultReceivedAt: 123 }), null); });
test("material equality ignores timestamps and detects stable-field changes", () => { const a = buildDealsCarDetailsSelection({ car, requestedCarId: "car-a", search, resultReceivedAt: 123 }); const b = buildDealsCarDetailsSelection({ car, requestedCarId: "car-a", search, resultReceivedAt: 456 }); assert(a && b); assert.equal(areDealsCarSelectionsMateriallyEqual(a, b), true); assert.equal(areDealsCarSelectionsMateriallyEqual(a, { ...b, id: "car-b" }), false); assert.equal(areDealsCarSelectionsMateriallyEqual(a, { ...b, provider: "Other" }), false); assert.equal(areDealsCarSelectionsMateriallyEqual(a, { ...b, sourcePrice: 101 }), false); assert.equal(areDealsCarSelectionsMateriallyEqual(a, { ...b, detailsPath: "/cars/details/other?pickupLocation=x&dropoffLocation=x&pickupDate=x&pickupTime=x&dropoffDate=x&dropoffTime=x&driverAge=x" }), false); });


test("selection uses the authoritative primary offer for persisted source fields", () => {
  const displayedOffer = getPrimaryCarOffer({ ...car, offers: [
    { ...car.offers[0]!, id: "offer-display", bookingProviderName: "Displayed", currency: "EUR", pricePerDay: 40, totalPrice: 80 },
    { ...car.offers[0]!, id: "offer-other", bookingProviderName: "Other", currency: "USD", pricePerDay: 10, totalPrice: 100 },
  ] });
  assert(displayedOffer);
  const selection = buildDealsCarDetailsSelection({ car: { ...car, offers: [displayedOffer, { ...car.offers[0]!, id: "offer-other", bookingProviderName: "Other", currency: "USD", pricePerDay: 10, totalPrice: 100 }] }, primaryOffer: displayedOffer, requestedCarId: "car-a", search, resultReceivedAt: 123 });
  assert(selection);
  assert.equal(selection.provider, displayedOffer.bookingProviderName);
  assert.equal(selection.sourcePrice, displayedOffer.totalPrice);
  assert.equal(selection.sourceCurrency, displayedOffer.currency);
});

test("selection rejects invalid authoritative primary offers without persisting later positive offers", () => {
  const invalidPrimaryCar: NormalizedCarResult = { ...car, offers: [
    { ...car.offers[0]!, id: "offer-zero", bookingProviderName: "Displayed", totalPrice: 0 },
    { ...car.offers[0]!, id: "offer-positive", bookingProviderName: "Other", totalPrice: 25 },
  ] };
  const displayedOffer = getPrimaryCarOffer(invalidPrimaryCar);
  assert.equal(displayedOffer?.id, "offer-zero");
  assert.equal(buildDealsCarDetailsSelection({ car: invalidPrimaryCar, primaryOffer: displayedOffer, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null);
  for (const totalPrice of [-1, Number.POSITIVE_INFINITY, Number.NaN]) {
    const invalidOffer = { ...car.offers[0]!, totalPrice };
    assert.equal(buildDealsCarDetailsSelection({ car: { ...car, offers: [invalidOffer] }, primaryOffer: invalidOffer, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null);
  }
  assert.equal(buildDealsCarDetailsSelection({ car: { ...car, offers: [{ ...car.offers[0]!, currency: " " }] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null);
  assert.equal(buildDealsCarDetailsSelection({ car: { ...car, rentalCompanyName: " ", offers: [{ ...car.offers[0]!, bookingProviderName: " " }] }, requestedCarId: "car-a", search, resultReceivedAt: 123 }), null);
});

test("source contract keeps deals Car details free of independent offer ranking", () => {
  const source = readFileSync(new URL("./dealsCarDetails.ts", import.meta.url), "utf8");
  assert.match(source, /getPrimaryCarOffer\(car\)/);
  assert.doesNotMatch(source, /car\.offers\.filter\([\s\S]*?\.sort\(/);
});
