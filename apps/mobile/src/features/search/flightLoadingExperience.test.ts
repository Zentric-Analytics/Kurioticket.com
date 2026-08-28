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
const skeletonStyles = screen.slice(
  screen.indexOf("  skeletonCard:"),
  screen.indexOf("  skeletonButton:"),
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
  assert.equal(flightSkeleton.match(/<View style=\{s0\.skeletonJourneyBlock\}>/g)?.length, 2);
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityLayout}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonJourneyBlock}>');
  assert.ok(journeyStart > identityStart);
});

test("skeleton surface and identity mirror the final result card", () => {
  assert.match(skeletonStyles, /skeletonCard: \{[\s\S]*?borderRadius: 16,[\s\S]*?paddingHorizontal: 12,[\s\S]*?paddingVertical: 9,[\s\S]*?gap: 5/);
  assert.doesNotMatch(skeletonStyles, /minHeight: 178|backgroundColor: "white"/);
  assert.match(skeletonStyles, /skeletonLogo: \{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 \}/);
  assert.match(skeletonStyles, /skeletonIdentityCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(flightSkeleton, /skeletonName[\s\S]*?skeletonFlightNumber[\s\S]*?skeletonBadge[\s\S]*?skeletonFavoriteButton[\s\S]*?skeletonHeart/);
  assert.match(skeletonStyles, /skeletonIdentityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 8 \}/);
  assert.doesNotMatch(skeletonStyles, /skeletonIdentityActions: \{[^\n]*flexDirection: "column"/);
  assert.match(skeletonStyles, /skeletonFavoriteButton: \{ width: 44, height: 44,[^\n]*alignItems: "center", justifyContent: "center" \}/);
});

test("journey skeleton separates labels, primary route, and stop rows", () => {
  assert.match(flightSkeleton, /skeletonJourneyLabel/);
  assert.match(flightSkeleton, /skeletonJourneyPrimaryRow/);
  assert.match(flightSkeleton, /skeletonJourneyRouteRow/);
  assert.match(flightSkeleton, /skeletonJourneyStopRow/);
  assert.doesNotMatch(screen, /skeletonDurationRow|skeletonTimeRow|skeletonAirportRow/);
  assert.match(skeletonStyles, /skeletonJourneyList: \{ width: "100%", marginTop: 10, gap: 10 \}/);
  assert.match(skeletonStyles, /skeletonSideColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.match(skeletonStyles, /skeletonTimelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(flightSkeleton, /skeletonJourneyPrimaryRow[\s\S]*?skeletonDuration[\s\S]*?skeletonJourneyRouteRow[\s\S]*?skeletonJourneyStopRow[\s\S]*?skeletonStop/);
});

test("fare and metadata skeletons follow the final full-width hierarchy", () => {
  assert.match(skeletonStyles, /skeletonFareRow: \{ width: "100%", paddingTop: 10, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" \}/);
  assert.match(skeletonStyles, /skeletonPriceLine: \{ width: 100, height: 16 \}/);
  assert.doesNotMatch(skeletonStyles, /skeletonPrice:|width: 52/);
  assert.match(flightSkeleton, /skeletonFareRow[\s\S]*?skeletonPriceLine[\s\S]*?skeletonMetadataDivider[\s\S]*?backgroundColor: theme\.border[\s\S]*?skeletonMetadataRow[\s\S]*?skeletonMetadataLine/);
  assert.match(skeletonStyles, /skeletonMetadataDivider: \{ width: "100%", height: StyleSheet\.hairlineWidth, marginTop: 6, marginBottom: 4 \}/);
  assert.match(skeletonStyles, /skeletonMetadataRow: \{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start" \}/);
  assert.doesNotMatch(screen, /skeletonMetadataItem|skeletonMetadataIcon|skeletonMetadataLineShort|skeletonPriceCaption/);
});

test("flight placeholders remain theme-aware and decorative", () => {
  assert.match(flightSkeleton, /const placeholder = \{ backgroundColor: theme\.border \}/);
  assert.match(flightSkeleton, /backgroundColor: theme\.surface, borderColor: theme\.border/);
  assert.match(flightSkeleton, /accessibilityElementsHidden/);
  assert.doesNotMatch(flightSkeleton, /#E7EBF1|accessibilityLabel|accessibilityRole/);
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
