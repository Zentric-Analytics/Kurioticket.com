import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchLoadingPresentation } from "../../../../../src/shared/presentation/searchLoadingPresentation";

const read = (name: string) => readFileSync(`src/features/search/${name}`, "utf8");

test("Flight, Hotel and Car share the canonical restrained loading presentation", () => {
  assert.deepEqual(searchLoadingPresentation("flight"), { title: "Searching the best flights for you", supportingText: "Checking airlines and fares…" });
  assert.deepEqual(searchLoadingPresentation("hotel"), { title: "Searching the best stays for you", supportingText: "Checking properties and rates…" });
  assert.deepEqual(searchLoadingPresentation("car"), { title: "Searching the best rental cars for you", supportingText: "Checking vehicles and providers…" });
});

test("all initial native canonical searches replace result chrome with the shared loader", () => {
  const travelResults = read("ApprovedResultsScreen.tsx");
  const carResults = read("ApprovedCarResultsScreen.tsx");
  assert.match(travelResults, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(carResults, /if\(status==="loading"\) return <NativeBrandedSearchLoading product="car"/);
  assert.match(read("NativeBrandedSearchLoading.tsx"), /NativeTravelSearchLoadingScreen/);
});

test("canonical loader is status-accessible and contains no decorative progress UI", () => {
  const source = read("NativeTravelSearchLoadingScreen.tsx");
  assert.match(source, /accessibilityRole="progressbar"/);
  assert.match(source, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /width: 194/);
  assert.match(source, /fontSize: 21/);
  assert.doesNotMatch(source, /Animated|setInterval|styles\.track|styles\.dots|styles\.glow|ActivityIndicator/);
});

test("Spanish and Arabic copy remains localized and RTL alignment is retained", () => {
  assert.notEqual(searchLoadingPresentation("flight", "es-ES").title, searchLoadingPresentation("flight").title);
  assert.match(searchLoadingPresentation("hotel", "ar").title, /[\u0600-\u06ff]/);
  assert.match(read("NativeTravelSearchLoadingScreen.tsx"), /direction === "rtl"/);
});
