import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("flow theme maps app dark preference to full-screen semantic colors", () => {
  const theme = read("src/features/flow/flowStyles.ts");
  assert.match(theme, /useAppTheme/);
  assert.match(theme, /page: theme\.background/);
  assert.match(theme, /card: theme\.surface/);
  assert.match(theme, /input: theme\.dark \? "#17243A" : flowColors\.white/);
  assert.match(theme, /text: theme\.text/);
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
  assert.match(explore, /color: theme\.text/);
  assert.match(explore, /color: theme\.muted/);
  assert.match(explore, /borderColor: theme\.border/);
  assert.doesNotMatch(explore, /backgroundColor: "#FAFBFF"/);
  assert.doesNotMatch(explore, /backgroundColor: "white"/);
  assert.match(profile, /theme\.background/);
  assert.match(profile, /theme\.surface/);
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
