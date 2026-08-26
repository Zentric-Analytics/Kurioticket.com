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

test("request truth stays loading while presentation starts in a separate searching phase", () => {
  assert.match(screen, /type Status = "loading" \| "ready" \| "empty" \| "error"/);
  assert.match(screen, /type FlightLoadingPhase = "searching" \| "skeleton"/);
  assert.match(screen, /useState<FlightLoadingPhase>\("searching"\)/);
  assert.match(screen, /flightLoadingIdentity === currentFlightLoadingIdentity[\s\S]*?flightLoadingPhase[\s\S]*?: "searching"/);
  assert.match(screen, /status === "loading"[\s\S]*?<FlightLoadingExperience/);
  assert.doesNotMatch(stateUi, /ActivityIndicator|Searching the best flights for you/);
});

test("searching copy uses the canonical destination without splash branding or result chrome", () => {
  assert.match(loader, /Searching for flights to \{destination\}…/);
  assert.match(loader, /Checking airlines and fares…/);
  assert.match(loader, /<PlaneTakeoff/);
  assert.doesNotMatch(loader, /Kurioticket|splash|PriceAlert|Results found|flightResultCountLabel/);
});

test("a presentation-only timer reveals and cleans up the almost-done phase", () => {
  assert.match(screen, /FLIGHT_LOADING_SKELETON_DELAY_MS = 1000/);
  assert.match(screen, /setFlightLoadingPhase\("searching"\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?setFlightLoadingPhase\("skeleton"\)/);
  assert.match(screen, /return \(\) => clearTimeout\(skeletonTimer\)/);
  assert.match(screen, /\[flightResults, plan\.plan\?\.key, retry, status\]/);
  assert.match(loader, /Almost done…/);
  assert.match(loader, /Comparing available flights and fares…/);
});

test("almost-done reuses three shared-pulse noninteractive flight skeletons", () => {
  assert.match(loader, /pointerEvents="none"/);
  assert.match(loader, /\[0, 1, 2\]\.map\(\(item\) => <FlightLoadingSkeleton/);
  assert.match(loader, /accessibilityElementsHidden/);
  assert.match(loader, /importantForAccessibility="no-hide-descendants"/);
  assert.match(loader, /Animated\.loop/);
  assert.match(loader, /useNativeDriver: true/);
  assert.match(loader, /return \(\) => animation\.stop\(\)/);
  assert.doesNotMatch(flightSkeleton, /Pressable|View details|\+1|\+2|provider|airlineName|skeletonButton/);
});

test("one-way uses one journey and round-trip conditionally adds the return journey", () => {
  assert.match(screen, /roundTrip=\{payload\.tripType === "round-trip"\}/);
  assert.match(flightSkeleton, /\{roundTrip \? \([\s\S]*?<View style=\{s0\.skeletonFlightRow\}>/);
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityRow}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonFlightRow}>');
  assert.ok(journeyStart > identityStart, "the full-width journey placeholder follows the identity row");
  assert.doesNotMatch(flightSkeleton.slice(identityStart, journeyStart), /skeletonFlightRow/);
});

test("flight skeleton stacks badge and heart in the right side of its identity row", () => {
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityRow}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonFlightRow}>');
  const identity = flightSkeleton.slice(identityStart, journeyStart);
  assert.match(identity, /skeletonLogo[\s\S]*skeletonName[\s\S]*skeletonIdentityActions[\s\S]*skeletonBadge[\s\S]*skeletonHeart/);
  assert.match(screen, /skeletonIdentityActions: \{ flexDirection: "column", flexShrink: 0/);
  assert.doesNotMatch(screen, /skeletonTopRow/);
});

test("validated results become terminal immediately without presentation waiting", () => {
  const validationToReady = screen.slice(screen.indexOf("const valid ="), screen.indexOf("setMessage(response.warnings"));
  assert.match(validationToReady, /setResults\(valid\);\s*resultsRef\.current = valid;\s*setStatus\(valid\.length \? "ready" : "empty"\);/);
  assert.doesNotMatch(validationToReady, /setTimeout|sleep|minimum|waitForAnimation|FLIGHT_LOADING_SKELETON_DELAY_MS/);
});

test("loading hides interactive date and filter rails without changing their ready order", () => {
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?status === "loading" \? null : \([\s\S]*?\{dateStrip\}[\s\S]*?\{filterRail\}/);
});
