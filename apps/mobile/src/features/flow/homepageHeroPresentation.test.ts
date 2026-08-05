import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const home = () => source("src/features/flow/HomeFlowScreen.tsx");
const tabsIndex = () => source("app/(tabs)/index.tsx");
const products = () => source("src/features/flow/ProductScreens.tsx");

const heroSourceUri =
  "https://kurioticket.com/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg";

test("Android and iOS share the same updated homepage hero presentation", () => {
  const screen = home();

  assert.match(tabsIndex(), /import \{ HomeFlowScreen \} from "\.\.\/\.\.\/src\/features\/flow\/HomeFlowScreen"/);
  assert.match(tabsIndex(), /export default HomeFlowScreen/);
  assert.match(screen, /export const HomeFlowScreen = SharedHomePage/);
  assert.equal(screen.match(/function HomeHero\(\)/g)?.length, 1);
  assert.doesNotMatch(screen, /Platform\.OS|Platform\.select|\.android|\.ios/);
});

test("homepage hero image asset, dimensions, crop, logo, and notification stay unchanged", () => {
  const screen = home();

  assert.match(screen, new RegExp(heroSourceUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(screen, /const HOME_HERO_WIDTH = 2047;/);
  assert.match(screen, /const HOME_HERO_HEIGHT = 1380;/);
  assert.match(screen, /const HOME_HERO_DISPLAY_HEIGHT = 300;/);
  assert.match(screen, /resizeMode="stretch"/);
  assert.match(screen, /const imageLeft = -\(imageWidth - width\) \* 0\.62;/);
  assert.match(screen, /const imageTop = -\(imageHeight - HOME_HERO_DISPLAY_HEIGHT\) \* 0\.5;/);
  assert.match(screen, /kurioticket-logo-primary-light-bg\.png/);
  assert.match(screen, /accessibilityLabel="Notifications"/);
});

test("homepage hero overlay is lighter but remains subtle for content contrast", () => {
  const screen = home();

  assert.match(screen, /<Stop offset="0" stopColor="#020617" stopOpacity=\{0\.18\} \/>/);
  assert.match(screen, /<Stop offset="0\.5" stopColor="#020617" stopOpacity=\{0\.04\} \/>/);
  assert.match(screen, /<Stop offset="1" stopColor="#020617" stopOpacity=\{0\} \/>/);
  assert.match(screen, /<Stop offset="0" stopColor="#020617" stopOpacity=\{0\.04\} \/>/);
  assert.match(screen, /<Stop offset="1" stopColor="#020617" stopOpacity=\{0\.06\} \/>/);
  assert.doesNotMatch(screen, /stopOpacity=\{0\.28\}|stopOpacity=\{0\.1\}/);
  assert.doesNotMatch(screen, /tintColor|opacity:\s*0\.[0-9]/);
});

test("homepage hero update keeps themes supported and does not change other product heroes", () => {
  const screen = home();
  const productScreens = products();

  assert.match(screen, /StatusBar style=\{ft\.theme\.dark \? "light" : "dark"\}/);
  assert.match(screen, /backgroundColor: ft\.colors\.surface/);
  assert.match(screen, /backgroundColor: ft\.colors\.card/);
  assert.match(productScreens, /hotelHeroOverlay/);
  assert.match(productScreens, /heroes\/cars-suv\.png/);
  assert.match(productScreens, /DealsScreen/);
  assert.doesNotMatch(productScreens, /horizontalOverlay|verticalOverlay|homeHeroSource/);
});
