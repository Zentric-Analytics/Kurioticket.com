import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("homepage navigation is the first item in scrolling content and is not pinned", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const scrollStart = home.indexOf("<ScrollView");
  const navigation = home.indexOf("<HomeTopNavigation", scrollStart);
  const hero = home.indexOf("<HomeHero />", scrollStart);
  const scrollEnd = home.indexOf("</ScrollView>", scrollStart);

  assert.ok(scrollStart < navigation && navigation < hero && hero < scrollEnd);
  assert.doesNotMatch(home, /stickyHeaderIndices/);
  assert.doesNotMatch(home, /homeTopNavigation:\s*\{[^}]*position:\s*["']absolute["']/s);
  assert.doesNotMatch(home, /homeTopNavigation:\s*\{[^}]*top:/s);
});

test("homepage uses one continuous header surface and applies its safe area once", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");

  assert.equal(home.match(/<HomeTopNavigation safeAreaTop=\{insets\.top\} \/>/g)?.length, 1);
  assert.equal(home.match(/<View style=\{\{ height: safeAreaTop \}\} \/>/g)?.length, 1);
  assert.doesNotMatch(home, /SafeAreaView/);
  assert.doesNotMatch(home, /paddingTop:\s*safeAreaTop/);
  assert.match(home, /homeTopNavigation:\s*\{\s*backgroundColor: "white",\s*marginHorizontal: -14,/);
  assert.doesNotMatch(
    home,
    /homeTopNavigation:\s*\{[^}]*(?:elevation|shadowColor|shadowOffset|shadowOpacity|shadowRadius)/s,
  );
  assert.match(
    home,
    /homeTopNavigation:\s*\{[^}]*borderBottomWidth: StyleSheet\.hairlineWidth,/s,
  );
});

test("homepage header assets and notification action render once", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.equal(home.match(/kurioticket-logo-primary-light-bg\.png/g)?.length, 1);
  assert.equal(home.match(/accessibilityLabel="Notifications"/g)?.length, 1);
  assert.equal(home.match(/router\.push\("\/notifications"\)/g)?.length, 1);
  assert.match(home, /homeTopNavigationContent:\s*\{\s*height: 60/);
});

test("hero directly follows the complete header for guests and signed-in users", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.match(
    home,
    /<View>\s*<HomeTopNavigation safeAreaTop=\{insets\.top\} \/>\s*<HomeHero \/>\s*<\/View>/,
  );
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*HomeTopNavigation/s);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*HomeHero/s);
});

test("non-homepage route files do not own the homepage header", () => {
  const routeFiles = ["app/(tabs)/explore.tsx", "app/(tabs)/trips.tsx"];
  for (const routeFile of routeFiles) {
    assert.doesNotMatch(source(routeFile), /HomeTopNavigation|homeTopNavigation/);
  }
});

test("bottom navigation remains owned by the fixed tabs layout", () => {
  const layout = source("app/(tabs)/_layout.tsx");
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.match(layout, /tabBar=\{\(props\) => <KurioticketTabBar \{\.\.\.props\} \/>\}/);
  assert.doesNotMatch(home, /KurioticketTabBar/);
});
