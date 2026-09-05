import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const loader = readFileSync("src/features/search/NativeTravelSearchLoadingScreen.tsx", "utf8");
const stateUi = readFileSync("src/features/search/FlightResultsState.tsx", "utf8");

test("initial Flight search uses the one full-screen branded loader", () => {
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.doesNotMatch(screen, /function FlightLoadingExperience|FLIGHT_LOADING_SKELETON_DELAY_MS/);
  assert.doesNotMatch(stateUi, /Searching the best flights for you/);
});

test("the branded loader owns calm native progress and accessible rotating status", () => {
  assert.match(loader, /kurioticket-logo-primary-light-bg\.png/);
  assert.match(loader, /accessibilityRole="progressbar"/);
  assert.match(loader, /accessibilityState=\{\{ busy: true \}\}/);
  assert.match(loader, /accessibilityLiveRegion="polite"/);
  assert.match(loader, /Animated\.loop/);
  assert.match(loader, /setInterval/);
  assert.match(loader, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.doesNotMatch(loader, /ActivityIndicator/);
});

test("results become ready without an artificial presentation delay", () => {
  const validationToReady = screen.slice(screen.indexOf("const valid ="), screen.indexOf("setMessage(response.warnings"));
  assert.match(validationToReady, /setResults\(valid\);\s*resultsRef\.current = valid;\s*setStatus\(valid\.length \? "ready" : "empty"\);/);
  assert.doesNotMatch(validationToReady, /setTimeout|sleep|minimum|waitForAnimation/);
});

test("ready Flight content retains dates, sticky filters, alert, count and cards", () => {
  const list = screen.slice(screen.indexOf("<Animated.SectionList"), screen.indexOf(") : (", screen.indexOf("<Animated.SectionList")));
  assert.match(list, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(list, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.match(list, /renderSectionHeader[\s\S]*?renderItem[\s\S]*?<FlightResultsSummaryRow[\s\S]*?count=\{sorted\.length\}[\s\S]*?<FlightCard/);
  assert.match(list.slice(list.indexOf("renderItem=")), /PriceAlert[\s\S]*FlightResultsSummaryRow[\s\S]*FlightCard/);
});
