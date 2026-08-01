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

test("homepage header assets and notification action render once", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.equal(home.match(/kurioticket-logo-primary-light-bg\.png/g)?.length, 1);
  assert.equal(home.match(/accessibilityLabel="Notifications"/g)?.length, 1);
  assert.equal(home.match(/router\.push\("\/notifications"\)/g)?.length, 1);
  assert.match(home, /homeTopNavigation:\s*\{\s*backgroundColor: "white"/);
  assert.match(home, /homeTopNavigationContent:\s*\{\s*height: 60/);
});

test("bottom navigation remains owned by the fixed tabs layout", () => {
  const layout = source("app/(tabs)/_layout.tsx");
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.match(layout, /tabBar=\{\(props\) => <KurioticketTabBar \{\.\.\.props\} \/>\}/);
  assert.doesNotMatch(home, /KurioticketTabBar/);
});
