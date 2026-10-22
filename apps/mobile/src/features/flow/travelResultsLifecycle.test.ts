import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
const approved = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");

test("flight, hotel, and car never route through legacy results during availability work", () => {
  assert.doesNotMatch(route, /LegacyTravelResultsScreen/);
  assert.match(route, /if \(initializing\) return <NativeTravelSearchLoadingScreen product=\{product\}/);
  assert.match(route, /product === "car".*ApprovedCarResultsScreen/);
  assert.match(route, /ApprovedResultsScreen product=\{product\}/);
});

test("confirmed product unavailability uses the dedicated state", () => {
  assert.match(route, /!isMobileProductAvailable\(availability, product\).*TravelProductUnavailableScreen/);
  assert.match(route, /search is temporarily unavailable/);
});

test("production results paths contain no legacy loading or build-fingerprint chrome", () => {
  for (const source of [route, approved, cars]) {
    assert.doesNotMatch(source, /Searching available flights|This search will stop automatically|Build:/);
  }
  assert.doesNotMatch(route, /Track this search|Create price alert|ActivityIndicator/);
});

test("availability and foreground transitions cannot own a travel search", () => {
  assert.doesNotMatch(route, /searchFlights|searchHotels|searchCars|AppState/);
  const appStateStart = approved.indexOf("AppState.addEventListener");
  const appStateEnd = approved.indexOf("subscription.remove()", appStateStart);
  const appStateEffect = approved.slice(appStateStart, appStateEnd);
  assert.doesNotMatch(appStateEffect, /searchFlights|searchHotels|load\(/);
});

test("initial loaders return before filters, counts, cards, navigation, and price alerts", () => {
  assert.ok(approved.indexOf('if (status === "loading")') < approved.indexOf("<Animated.SectionList"));
  assert.ok(cars.indexOf('if(status==="loading")') < cars.indexOf("<CarResultsHeader"));
});

test("car search uses canonical identity generations, abort, and stale-response guards", () => {
  assert.match(cars, /\[plan\.plan\?\.key,retry\]/);
  assert.match(cars, /activeSearch\.current\?\.abort\("superseded"\)/);
  assert.match(cars, /searchCars\(plan\.plan\.payload,\{signal:controller\.signal,requestId\}\)/);
  assert.match(cars, /controller\.signal\.aborted\|\|sequence!==searchSequence\.current/);
  assert.match(cars, /activeSearch\.current\?\.abort\("screen-cleanup"\)/);
  assert.match(cars, /activeExecutionKey\.current!==executionKey/);
  assert.doesNotMatch(cars, /AppState/);
});

test("every product leaves loading on timeout and exposes an explicit retry", () => {
  assert.match(approved, /e instanceof TravelApiError && e\.code === "timeout"/);
  assert.match(approved, /Flight search took too long\. Please try again\./);
  assert.match(approved, /retry=\{\(\) => setRetry\(\(x\) => x \+ 1\)\}/);
  assert.match(cars, /setStatus\("error"\)/);
  assert.match(cars, /retry=\{\(\)=>setRetry\(\(value\)=>value\+1\)\}/);
});
