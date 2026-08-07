import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");
const promo = source("src/features/home/HomepageDealPromos.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");
const navigation = source("src/features/home/homepagePromoNavigation.ts");

test("both homepage deal cards render their complete promotional copy", () => {
  assert.match(promo, /Flight deals from top airlines/);
  assert.match(
    promo,
    /Discover limited-time fares and compare options instantly\./,
  );
  assert.match(promo, /Explore flight deals/);
  assert.match(promo, /Hotel savings worldwide/);
  assert.match(
    promo,
    /Browse stays from boutique hotels to global chains with price transparency\./,
  );
  assert.match(promo, /Explore hotel deals/);
});

test("light-mode homepage promo colors remain unchanged", () => {
  assert.match(promo, /lightBackgroundColor: "#EAF2FF"/);
  assert.match(promo, /lightBackgroundColor: "#E5F7F5"/);
  assert.match(promo, /lightBorderColor: "rgba\(6,76,247,0\.08\)"/);
  assert.match(promo, /: promo\.lightBackgroundColor/);
  assert.match(promo, /: promo\.lightBorderColor/);
});

test("dark-mode homepage promo cards use distinct category-aware surfaces", () => {
  assert.match(promo, /darkBackgroundColor: "#102A56"/);
  assert.match(promo, /darkBorderColor: "rgba\(91,141,255,0\.38\)"/);
  assert.match(promo, /darkBackgroundColor: "#123A35"/);
  assert.match(promo, /darkBorderColor: "rgba\(64,196,176,0\.36\)"/);
  assert.doesNotMatch(
    promo,
    /backgroundColor:\s*ft\.theme\.dark\s*\?\s*ft\.colors\.surface/,
  );
  assert.doesNotMatch(
    promo,
    /backgroundColor:\s*ft\.theme\.dark\s*\?\s*ft\.theme\.background/,
  );
  assert.match(
    promo,
    /\? promo\.darkBackgroundColor\s*: promo\.lightBackgroundColor/s,
  );
});

test("dark-mode promo text uses readable scoped colors", () => {
  assert.match(
    promo,
    /const titleColor = ft\.theme\.dark \? "#F4F7FF" : ft\.colors\.textPrimary/,
  );
  assert.match(
    promo,
    /const descriptionColor = ft\.theme\.dark \? "#C8D2E6" : ft\.colors\.textSecondary/,
  );
  assert.match(promo, /styles\.heading, \{ color: titleColor \}/);
  assert.match(promo, /styles\.description, \{ color: descriptionColor \}/);
});

test("dark-mode promo icon circles are category aware", () => {
  assert.match(promo, /darkIconBackgroundColor: "#193B74"/);
  assert.match(promo, /darkIconBackgroundColor: "#1A514A"/);
  assert.match(
    promo,
    /ft\.theme\.dark && \{\s*backgroundColor: promo\.darkIconBackgroundColor,?\s*\}/s,
  );
  assert.match(promo, /backgroundColor: "rgba\(255,255,255,0\.7\)"/);
});

test("promo buttons keep labels and styling while using the website routes", () => {
  assert.match(
    promo,
    /buttonLabel: "Explore flight deals"[\s\S]*?router\.push\(HOMEPAGE_FLIGHT_PROMO_ROUTE\)/,
  );
  assert.match(
    promo,
    /buttonLabel: "Explore hotel deals"[\s\S]*?router\.push\(buildHomepageHotelPromoRoute\(\)\)/,
  );
  assert.match(promo, /onPress=\{promo\.onPress\}/);
  assert.match(promo, /backgroundColor: flowColors\.blue/);
  assert.match(promo, /minHeight: 48/);
});

test("deal cards reuse vector icons and navigate through shared handlers", () => {
  assert.match(promo, /icon: "flight"/);
  assert.match(promo, /icon: "hotel"/);
  assert.match(promo, /<FlowIcon name=\{promo\.icon\}/);
  assert.match(navigation, /HOMEPAGE_FLIGHT_PROMO_ROUTE = "\/deals"/);
  assert.match(navigation, /pathname: "\/hotel-results"/);
  assert.doesNotMatch(promo, /require\(|\.(?:png|jpe?g|gif|webp)/i);
});

test("promos follow popular destination stays for every home session", () => {
  const popular = home.indexOf("<PopularDestinationStays />");
  const promos = home.indexOf("<HomepageDealPromos />");

  assert.ok(popular !== -1 && popular < promos);
  assert.equal(home.match(/<HomepageDealPromos \/>/g)?.length, 1);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*HomepageDealPromos/s);
});

test("promos remain homepage-only and no third planning section is added", () => {
  for (const route of [
    "../flow/ProductScreens.tsx",
    "../flow/TabScreens.tsx",
  ]) {
    assert.doesNotMatch(
      source(`src/features/home/${route}`),
      /HomepageDealPromos/,
    );
  }
  assert.doesNotMatch(
    `${promo}\n${home}`,
    /Start planning your trip around the world/i,
  );
});

test("homepage promo implementation adds no binary assets", () => {
  const binaryExtensions = /\.(?:png|jpe?g|gif|webp|bmp|ico)$/i;
  const files = readdirSync(join(process.cwd(), "src/features/home"));
  assert.deepEqual(
    files.filter(
      (file) =>
        statSync(join(process.cwd(), "src/features/home", file)).isFile() &&
        binaryExtensions.test(file),
    ),
    [],
  );
});
