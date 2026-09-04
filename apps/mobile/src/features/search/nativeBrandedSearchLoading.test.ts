import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchLoadingPresentation } from "../../../../../src/shared/presentation/searchLoadingPresentation";

const read = (name: string) => readFileSync(`src/features/search/${name}`, "utf8");

test("Flight, Hotel and Car share the canonical restrained loading presentation", () => {
  assert.deepEqual(searchLoadingPresentation("flight").messages, ["Checking airlines and fares…", "Comparing routes and prices…", "Preparing your flight options…"]);
  assert.deepEqual(searchLoadingPresentation("hotel").messages, ["Checking properties and rates…", "Comparing rooms and amenities…", "Preparing your stay options…"]);
  assert.deepEqual(searchLoadingPresentation("car").messages, ["Checking vehicles and providers…", "Comparing rental rates and terms…", "Preparing your car options…"]);
});

test("all initial native canonical searches replace result chrome with the shared loader", () => {
  const travelResults = read("ApprovedResultsScreen.tsx");
  const carResults = read("ApprovedCarResultsScreen.tsx");
  assert.match(travelResults, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(carResults, /if\(status==="loading"\) return <NativeBrandedSearchLoading product="car"/);
  assert.match(read("NativeBrandedSearchLoading.tsx"), /NativeTravelSearchLoadingScreen/);
});

test("canonical loader provides restrained motion, rotating status and clear progress", () => {
  const source = read("NativeTravelSearchLoadingScreen.tsx");
  assert.match(source, /accessibilityRole="progressbar"/);
  assert.match(source, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(source, /reduceMotionChanged/);
  assert.match(source, /setInterval[\s\S]*?1_800/);
  assert.match(source, /Animated\.timing\(progress[\s\S]*?toValue: 0\.92[\s\S]*?duration: 14_000/);
  assert.match(source, /styles\.track/);
  assert.match(source, /width: 194/);
  assert.match(source, /fontSize: 21/);
  assert.doesNotMatch(source, /ActivityIndicator/);
});

test("Spanish and Arabic copy remains localized and RTL alignment is retained", () => {
  assert.notEqual(searchLoadingPresentation("flight", "es-ES").title, searchLoadingPresentation("flight").title);
  assert.match(searchLoadingPresentation("hotel", "ar").title, /[\u0600-\u06ff]/);
  assert.match(read("NativeTravelSearchLoadingScreen.tsx"), /direction === "rtl"/);
});

test("reduced motion stops animation and status rotation while preserving progress feedback", () => {
  const source = read("NativeTravelSearchLoadingScreen.tsx");
  assert.match(source, /if \(reduceMotion\) return;[\s\S]*?setInterval/);
  assert.match(source, /if \(reduceMotion\) \{[\s\S]*?pulse\.setValue\(0\);[\s\S]*?progress\.setValue\(0\.45\)/);
});
