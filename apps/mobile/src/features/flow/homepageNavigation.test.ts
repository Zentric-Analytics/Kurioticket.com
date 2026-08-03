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

test("homepage alone owns the logo and notification action", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const products = source("src/features/flow/ProductScreens.tsx");
  assert.equal(home.match(/kurioticket-logo-primary-light-bg\.png/g)?.length, 1);
  assert.equal(home.match(/accessibilityLabel="Notifications"/g)?.length, 1);
  assert.equal(home.match(/router\.push\("\/notifications"\)/g)?.length, 1);
  assert.match(home, /homeTopNavigationContent:\s*\{\s*height: 60/);
  assert.doesNotMatch(products, /kurioticket-logo-primary-light-bg\.png/);
  assert.doesNotMatch(products, /<HomeTopNavigation/);
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

test("Hotels starts with its hero and overlaps it with search without marketing copy", () => {
  const products = source("src/features/flow/ProductScreens.tsx");
  const hotels = products.slice(
    products.indexOf("export function HotelsScreen()"),
    products.indexOf("export function CarsScreen()"),
  );

  assert.match(hotels, /<ScrollView[^>]*>\s*<View style=\{styles\.hotelHero\}>/s);
  assert.match(hotels, /<View pointerEvents="none" style=\{styles\.hotelHeroOverlay\} \/>/);
  assert.match(products, /hotelBody:\s*\{\s*marginTop:\s*-22/);
  assert.doesNotMatch(hotels, /HomeTopNavigation|accessibilityLabel="Notifications"/);
  assert.doesNotMatch(hotels, /accessibilityRole="header"|Find the stays|Compare hotels/);
});

test("bottom navigation remains owned by the fixed tabs layout", () => {
  const layout = source("app/(tabs)/_layout.tsx");
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.match(layout, /tabBar=\{\(props\) => <KurioticketTabBar \{\.\.\.props\} \/>\}/);
  assert.doesNotMatch(home, /KurioticketTabBar/);
});
