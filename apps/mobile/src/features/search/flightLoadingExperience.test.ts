import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const stateUi = readFileSync("src/features/search/FlightResultsState.tsx", "utf8");
const loader = screen.slice(
  screen.indexOf("function FlightLoadingExperience"),
  screen.indexOf("function SkeletonLine"),
);
const flightSkeleton = screen.slice(
  screen.indexOf("function FlightLoadingSkeleton"),
  screen.indexOf("function HotelLoadingSkeleton"),
);
const flightList = screen.slice(screen.indexOf("<Animated.SectionList"), screen.indexOf(") : (", screen.indexOf("<Animated.SectionList")));

test("loading is the single guaranteed SectionList header presentation", () => {
  assert.match(flightList, /ListHeaderComponent=\{status === "loading" \? \([\s\S]*?<FlightLoadingExperience/);
  assert.match(flightList, /ListEmptyComponent=\{null\}/);
  assert.equal(screen.match(/<FlightLoadingExperience/g)?.length, 1);
  assert.match(flightList, /origin=\{String\(payload\.origin \|\| ""\)\.toUpperCase\(\)\}/);
  assert.match(flightList, /destination=\{String\(payload\.destination \|\| ""\)\.toUpperCase\(\)\}/);
  assert.doesNotMatch(stateUi, /ActivityIndicator|Searching the best flights for you/);
});

test("route status uses canonical endpoints and evolves only its copy", () => {
  assert.match(loader, /\{origin\}[\s\S]*?\{destination\}/);
  assert.match(loader, /Searching for flights to \$\{destination\}…/);
  assert.match(loader, /Checking airlines, schedules and fares…/);
  assert.match(loader, /Comparing the best options…/);
  assert.match(loader, /Reviewing fares and journey times…/);
  assert.match(loader, /<PlaneTakeoff/);
  assert.doesNotMatch(loader, /Kurioticket|splash|PriceAlert|flightResultCountLabel/);
});

test("the presentation timer changes copy without gating skeletons", () => {
  assert.match(screen, /FLIGHT_LOADING_SKELETON_DELAY_MS = 1000/);
  assert.match(screen, /setFlightLoadingPhase\("searching"\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?setFlightLoadingPhase\("skeleton"\)/);
  assert.match(screen, /return \(\) => clearTimeout\(skeletonTimer\)/);
  const conditionalCopy = loader.indexOf("{searching ?");
  const skeletonList = loader.indexOf("<Animated.View", conditionalCopy);
  assert.ok(conditionalCopy >= 0 && skeletonList > conditionalCopy);
  assert.doesNotMatch(loader.slice(conditionalCopy, skeletonList), /FlightLoadingSkeleton/);
  assert.match(loader.slice(skeletonList), /\[0, 1, 2\]\.map\(\(item\) => <FlightLoadingSkeleton/);
});

test("three skeletons share a subtle native pulse that cleans up", () => {
  assert.match(loader, /pointerEvents="none"/);
  assert.match(loader, /accessibilityRole="progressbar"/);
  assert.match(loader, /accessibilityLiveRegion="polite"/);
  assert.match(loader, /outputRange: \[0\.72, 1\]/);
  assert.match(loader, /Animated\.loop/);
  assert.match(loader, /useNativeDriver: true/);
  assert.match(loader, /return \(\) => animation\.stop\(\)/);
  assert.match(loader, /accessibilityElementsHidden/);
  assert.match(loader, /importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(flightSkeleton, /Pressable|View details|provider|airlineName|skeletonButton/);
});

test("one-way uses one journey and round-trip conditionally adds the return journey", () => {
  assert.match(flightList, /roundTrip=\{payload\.tripType === "round-trip"\}/);
  assert.match(flightSkeleton, /\{roundTrip \? \([\s\S]*?<View style=\{s0\.skeletonJourneyBlock\}>/);
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityRow}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonJourneyBlock}>');
  assert.ok(journeyStart > identityStart);
});

test("terminal states use a guaranteed footer and retain their actions", () => {
  assert.match(flightList, /ListFooterComponent=\{terminalFlightState \? \([\s\S]*?<FlightResultsState/);
  assert.match(flightList, /onRetry=\{retrySearch\}/);
  assert.match(flightList, /onEditSearch=\{edit\}/);
  assert.match(flightList, /onClearFilters=\{clearFlightFilters\}/);
  assert.match(flightList, /onAdjustFilters=\{\(\) => openFlightFilters\("all"\)\}/);
});

test("loading hides interactive rails and valid results become ready immediately", () => {
  assert.match(screen, /renderSectionHeader=\{\(\) => status === "loading" \? null : \([\s\S]*?\{filterRail\}/);
  assert.match(flightList, /status === "loading"[\s\S]*?<FlightLoadingExperience[\s\S]*?: animatedFlightDateStrip/);
  const validationToReady = screen.slice(screen.indexOf("const valid ="), screen.indexOf("setMessage(response.warnings"));
  assert.match(validationToReady, /setResults\(valid\);\s*resultsRef\.current = valid;\s*setStatus\(valid\.length \? "ready" : "empty"\);/);
  assert.doesNotMatch(validationToReady, /setTimeout|sleep|minimum|waitForAnimation|FLIGHT_LOADING_SKELETON_DELAY_MS/);
});
