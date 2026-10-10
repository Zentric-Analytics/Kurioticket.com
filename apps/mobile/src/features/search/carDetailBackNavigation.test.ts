import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const results = read("src/features/search/ApprovedCarResultsScreen.tsx");
const details = read("src/features/search/ApprovedCarDetailScreen.tsx");
const saved = read("src/features/saved/SavedScreen.tsx");
const card = read("src/features/search/CarResultCard.tsx");
const picker = read("src/features/search/NativeCarResultOfferPicker.tsx");
const dealActions = read("src/features/search/nativeCarResultDeals.ts");
const returnToCarResultsStart = details.indexOf("const returnToCarResults");
const returnToResults = details.slice(returnToCarResultsStart, details.indexOf("const light =", returnToCarResultsStart));
const savedCarRoute = saved.slice(saved.indexOf('if (item.type === "car")'), saved.indexOf("const destinationId"));

test("Cars Results exposes provider links in cards without navigating to the details page", () => {
  assert.doesNotMatch(results, /pathname\s*:\s*"\/car-details"|carResultsStack/);
  assert.doesNotMatch(results, /const openDeal=/);
  assert.match(results, /<CarResultCard result=\{item\}/);
  assert.match(card, /<NativeCarResultOfferPicker result=\{result\}/);
  assert.match(card, /nativeCarPrimaryBookingUrl\(result\)/);
  assert.match(card, /disabled=\{!primaryBookingUrl\}/);
  assert.match(card, /Linking\.openURL\(primaryBookingUrl\)/);
  assert.match(picker, /Linking\.openURL\(bookingUrl\)/);
  assert.match(dealActions, /getCarDealPickerGroups\(result\)/);
  assert.doesNotMatch(card, /router\.push|\/car-details/);
});

test("Cars Details reads provenance and dismisses to actual existing Results", () => {
  assert.match(details, /useNavigation/);
  assert.match(details, /const\s+navigation\s*=\s*useNavigation\s*\(\s*\)/);
  assert.match(details, /one\s*\(\s*params\.carResultsStack\s*\)\s*===\s*"1"/);
  assert.doesNotMatch(details, /const\s+carResultsStack\s*=\s*true/);
  assert.match(returnToResults, /if\s*\(\s*carResultsStack\s*\)/);
  assert.match(returnToResults, /carResultsDismissCount\s*\(\s*navigation\.getState\s*\(\s*\)\s*\)/);
  assert.match(returnToResults, /router\.dismiss\s*\(\s*dismissCount\s*\)\s*;\s*return\s*;/);
  assert.doesNotMatch(returnToResults, /router\.(?:back|dismissTo|setParams|navigate|push)\s*\(/);
});

test("Cars Details retains the canonical Results replacement fallback", () => {
  assert.match(returnToResults, /router\.replace\s*\(\s*\{\s*pathname\s*:\s*"\/car-results"\s*,\s*params\s*:\s*search\s*\}\s*\)/);
  for (const field of ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"]) assert.match(details, new RegExp(`\\b${field}(?::|,)`));
});

test("Saved Cars open Details without Results-stack provenance", () => {
  assert.match(savedCarRoute, /router\.push\s*\(\s*\{\s*pathname\s*:\s*"\/car-details"/);
  assert.doesNotMatch(savedCarRoute, /carResultsStack/);
});
