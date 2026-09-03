import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SEARCH_LOADING_ROTATION_MS, searchLoadingPresentation } from "../../../../../src/shared/presentation/searchLoadingPresentation";

const read = (name: string) => readFileSync(`src/features/search/${name}`, "utf8");

test("Flight, Hotel and Car share the canonical branded loading presentation", () => {
  assert.equal(SEARCH_LOADING_ROTATION_MS, 1_800);
  assert.equal(searchLoadingPresentation("flight").title, "Searching the best flights for you");
  assert.equal(searchLoadingPresentation("hotel").title, "Finding the best stays for you");
  assert.equal(searchLoadingPresentation("car").title, "Looking for the best car rental options");
  for (const product of ["flight", "hotel", "car"] as const) assert.ok(searchLoadingPresentation(product).messages.length >= 3);
});

test("all initial native canonical searches replace their result chrome with the branded loader", () => {
  const travelResults = read("ApprovedResultsScreen.tsx");
  const carResults = read("ApprovedCarResultsScreen.tsx");
  assert.match(travelResults, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(carResults, /if\(status==="loading"\) return <NativeBrandedSearchLoading product="car"/);
  assert.doesNotMatch(carResults, /status==="loading"\?<CarSkeletons/);
});

test("native loader cleans up rotation and motion animations and exposes busy accessibility", () => {
  const source = read("NativeBrandedSearchLoading.tsx");
  assert.match(source, /return \(\) => clearInterval\(timer\)/);
  assert.match(source, /logoAnimation\.stop\(\); progressAnimation\.stop\(\)/);
  assert.match(source, /isReduceMotionEnabled/);
  assert.match(source, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
});

test("Spanish and Arabic loading copy is localized and Arabic retains RTL alignment", () => {
  assert.notEqual(searchLoadingPresentation("flight", "es-ES").title, searchLoadingPresentation("flight").title);
  assert.match(searchLoadingPresentation("hotel", "ar").title, /[\u0600-\u06ff]/);
  assert.match(read("NativeBrandedSearchLoading.tsx"), /direction === "rtl"/);
});
