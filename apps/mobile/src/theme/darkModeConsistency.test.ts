import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("flow theme maps app dark preference to full-screen semantic colors", () => {
  const theme = read("src/features/flow/flowStyles.ts") + read("src/features/flow/flowThemeColors.ts");
  assert.match(theme, /useAppTheme/);
  assert.match(theme, /page: theme\.background/);
  assert.match(theme, /card: theme\.surface/);
  assert.match(theme, /input: theme\.dark \? "#17243A" : flowColors\.white/);
  assert.match(theme, /text: theme\.textPrimary/);
  assert.match(theme, /secondaryText: theme\.muted/);
  assert.match(theme, /placeholder: theme\.muted/);
  assert.match(theme, /overlay: theme\.dark \? "#020617AA" : "#071A4866"/);
});

test("Home, Trips, Explore, and Profile use theme-aware screen and card surfaces", () => {
  const home = read("src/features/flow/HomeFlowScreen.tsx");
  const trips = read("src/features/flow/TabScreens.tsx");
  const explore = read("src/features/explore/ExploreScreen.tsx");
  const profile = read("src/features/profile/ProfileScreen.tsx");
  assert.match(home, /useFlowTheme/);
  assert.match(home, /ft\.styles\.safe/);
  assert.match(home, /ft\.colors\.card/);
  assert.match(trips, /useFlowTheme/);
  assert.match(trips, /ft\.styles\.safe/);
  assert.match(trips, /ft\.styles\.card/);
  assert.match(explore, /useAppTheme/);
  assert.match(explore, /backgroundColor: theme\.background/);
  assert.match(explore, /backgroundColor: theme\.surface/);
  assert.match(explore, /borderColor: theme\.border/);
  assert.match(explore, /color: theme\.textPrimary/);
  assert.match(explore, /color: theme\.textSecondary/);
  assert.match(explore, /color=\{theme\.icon\}/);
  assert.match(explore, /placeholderTextColor=\{theme\.textMuted\}/);
  assert.match(profile, /theme\.background/);
  assert.match(profile, /theme\.surface/);
});

test("Explore destination details and invalid state use semantic theme colors", () => {
  const details = read("src/features/explore/DestinationDetailsScreen.tsx");
  assert.match(details, /useAppTheme/);
  assert.match(details, /backgroundColor: theme\.background/);
  assert.match(details, /backgroundColor: theme\.surface/);
  assert.match(details, /borderBottomColor: theme\.border/);
  assert.match(details, /color: theme\.textPrimary/);
  assert.match(details, /color: theme\.textSecondary/);
  assert.match(details, /color=\{theme\.icon\}/);
  assert.doesNotMatch(details, /const (?:NAVY|MUTED|BORDER) =/);
  assert.doesNotMatch(details, /backgroundColor: (?:"white"|"#FAFBFF"|"#E7ECF5")/);
});

test("Explore region browse, search results, and invalid state use semantic theme colors", () => {
  const region = read("src/features/explore/ExploreRegionScreen.tsx");
  assert.match(region, /useAppTheme/);
  assert.match(region, /backgroundColor: theme\.background/);
  assert.match(region, /backgroundColor: theme\.surface/);
  assert.match(region, /borderColor: theme\.border/);
  assert.match(region, /color: theme\.textPrimary/);
  assert.match(region, /color: theme\.textSecondary/);
  assert.match(region, /color: theme\.textMuted/);
  assert.match(region, /color=\{theme\.icon\}/);
  assert.match(region, /placeholderTextColor=\{theme\.textMuted\}/);
  assert.match(region, /theme\.dark && s\.darkShadow/);
  assert.doesNotMatch(region, /const (?:NAVY|MUTED|BORDER) =/);
  assert.doesNotMatch(region, /backgroundColor: (?:"white"|"#FAFBFF"|"#E7ECF5")/);
});

test("flight details themes every booking surface without changing its route or layout", () => {
  const route = read("app/flight-details.tsx");
  const results = read("src/features/search/ApprovedResultsScreen.tsx");
  const details = read("src/features/search/ApprovedDetailScreen.tsx");
  const searchUi = read("src/features/search/SearchUi.tsx");

  assert.match(route, /ApprovedDetailScreen product="flight"/);
  assert.match(results, /pathname: "\/flight-details"/);
  assert.match(details, /useAppTheme/);
  assert.match(details, /backgroundColor: theme\.background/);
  assert.match(details, /backgroundColor: theme\.surface/);
  assert.match(details, /borderColor: theme\.border/);
  assert.match(details, /borderTopColor: theme\.border/);
  assert.match(details, /color: theme\.textPrimary/);
  assert.match(details, /color: theme\.textSecondary/);
  assert.match(searchUi, /name="bell" color=\{theme\.icon\}/);
  assert.match(details, /theme\.dark && \{ backgroundColor: "#153B2B" \}/);
  assert.match(searchUi, /backgroundColor: flightResults \? theme\.background : theme\.surface/);
  assert.match(searchUi, /<FlowIcon name="(?:heart|share)" color=\{theme\.icon\}/);
});

test("product search panels and picker sheets have theme-aware inputs, placeholders, and modals", () => {
  for (const file of ["FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "CarSearchPanel.tsx"]) {
    const source = read(`src/features/flow/${file}`);
    assert.match(source, /useFlowTheme/);
  }
  const primitives = read("src/features/flow/FlowPrimitives.tsx");
  assert.match(primitives, /backgroundColor: ft\.colors\.input/);
  assert.match(primitives, /backgroundColor: ft\.colors\.surface/);
  assert.match(primitives, /borderBottomColor: ft\.colors\.border/);
});

test("navigation, status bar, persistence, and light-mode tokens stay connected", () => {
  const root = read("app/_layout.tsx");
  const tabs = read("src/features/tabs/KurioticketTabBar.tsx");
  const provider = read("src/theme/AppTheme.tsx");
  const storage = read("src/storage/preferenceStorage.ts");
  assert.match(root, /StatusBar style=\{theme\.dark \? "light" : "dark"\}/);
  assert.match(tabs, /useAppTheme/);
  assert.match(tabs, /backgroundColor: theme\.surface/);
  assert.match(provider, /readDarkMode\(\)/);
  assert.match(provider, /writeDarkMode\(enabled\)/);
  assert.match(storage, /DARK_MODE_KEY/);
  assert.match(provider, /lightTheme[\s\S]*background: "#FAFBFF"/);
});
