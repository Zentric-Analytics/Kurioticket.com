import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("car results route mounts the active approved car results surface", () => {
  const route = readFileSync("app/car-results.tsx", "utf8");
  const travelResults = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
  assert.match(route, /TravelResultsScreen product="car"/);
  assert.match(travelResults, /product === "car".*ApprovedCarResultsScreen/);
});

test("approved car results use the live API contract and open the native detail route", () => {
  const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
  assert.match(screen, /travelApi\.searchCars/);
  assert.match(screen, /validBookableCar/);
  assert.match(screen, /pathname:\s*"\/car-details"/);
  assert.match(screen, /result:\s*JSON\.stringify\(result\)/);
  assert.doesNotMatch(screen, /Linking\.openURL/);
  assert.match(screen, /CarResultCard/);
  assert.doesNotMatch(screen, /Hertz|Enterprise|Toyota RAV4|Chevrolet Tahoe/);
});

test("car card retains truthful model, specification, benefit, supplier and price mappings", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  for (const field of ["modelName", "categoryLabel", "passengers", "bags", "transmission", "airConditioning", "mileagePolicy", "freeCancellation", "payAtPickup", "rentalCompanyName", "pickupLocation", "pricePerDay", "totalPrice"]) {
    assert.match(card, new RegExp(`result\\.${field}|offer\\?\\.${field}|offer\\.${field}`));
  }
});

test("native car details route mounts the approved detail surface", () => {
  const route = readFileSync("app/car-details.tsx", "utf8");
  assert.match(route, /ApprovedCarDetailScreen/);
});

test("car details retain selected result context and can truthfully recover it", () => {
  const detail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
  assert.match(detail, /parseResult\(one\(params\.result\)\)/);
  assert.match(detail, /travelApi\.searchCars/);
  assert.match(detail, /item\.id===one\(params\.resultId\)/);
  for (const field of ["pickupLocation", "returnLocation", "passengers", "bags", "transmission", "airConditioning", "mileagePolicy", "fuelPolicy", "minimumDriverAge", "offers"]) {
    assert.match(detail, new RegExp(`result\\.${field}`));
  }
});

test("car details only enable external booking for a real HTTPS provider URL", () => {
  const detail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
  const state = readFileSync("src/features/search/carDetailState.ts", "utf8");
  assert.match(detail, /canBookCarOffer\(result\.searchPolicy\.bookable,selected\)/);
  assert.match(state, /url\.protocol === "https:"/);
  assert.match(state, /Boolean\(url\.hostname\)/);
  assert.match(detail, /disabled=\{!bookable\}/);
  assert.match(detail, /Linking\.openURL\(selected\.bookingUrl\)/);
  assert.match(detail, /No live provider booking link is available/);
  assert.match(detail, /Button external/);
});

test("car result and details share one synchronized save store", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  const detail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
  const store = readFileSync("src/features/search/carSavedState.ts", "utf8");
  assert.match(card, /useSavedCar\(result\.id\)/);
  assert.match(detail, /useSavedCar\(result\.id\)/);
  assert.match(store, /useSyncExternalStore/);
});

test("car details preserve geometry for loading and stale-result states", () => {
  const detail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
  assert.match(detail, /CarDetailLoading/);
  assert.match(detail, /gallerySkeleton/);
  assert.match(detail, /provider-row skeleton|sectionSkeleton/);
  assert.match(detail, /This car is no longer available/);
  assert.match(detail, /Back to car results/);
});
