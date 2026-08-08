import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { homepageAdventureDiscoveryItems, readFreshDiscoveryFare } from "./HomepageAdventureDiscoveryData";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const section = source("src/features/home/HomepageAdventureDiscovery.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");
const regional = source("src/features/home/RegionalDestinationRoutes.tsx");

test("new adventure discovery is independently inserted in the required Home order", () => {
  const popular = home.indexOf("<PopularDestinationStays />");
  const adventure = home.indexOf("<HomepageAdventureDiscovery />");
  const promos = home.indexOf("<HomepageDealPromos />");
  const regionalSection = home.indexOf("<RegionalDestinationRoutes />");
  assert.ok(popular < adventure && adventure < promos && promos < regionalSection);
  assert.match(section, /Discover your next adventure here/);
  assert.match(section, /Compare smart route ideas, flexible fares, and destinations picked for your region\./);
  assert.match(regional, /Discover destinations from your region/);
  assert.equal(home.match(/<RegionalDestinationRoutes \/>/g)?.length, 1);
});

test("discovery cards use the web route content and existing mobile contracts", () => {
  assert.equal(homepageAdventureDiscoveryItems.length, 8);
  assert.deepEqual(homepageAdventureDiscoveryItems.slice(0, 2).map(({ title, originCode, destinationCode }) => ({ title, originCode, destinationCode })), [
    { title: "London business and weekend mix", originCode: "LOS", destinationCode: "LHR" },
    { title: "Dubai shopping stopover", originCode: "LOS", destinationCode: "DXB" },
  ]);
  assert.match(section, /router\.push\(discoverAdventureNavigation\(item\)\)/);
  assert.match(section, /event\.stopPropagation\(\); onFavorite\(\);/);
  assert.match(section, /toggle\(item\.id\)/);
});

test("only fresh, exact-route, provider-backed fares can be displayed", () => {
  const item = homepageAdventureDiscoveryItems[0];
  const fresh = { priceState: "fresh", fare: { providerBacked: true, price: 512, currency: "USD", origin: "LOS", code: "LHR", expiresAt: "2030-01-01T00:00:00.000Z" } };
  assert.deepEqual(readFreshDiscoveryFare(fresh, item, Date.parse("2029-01-01")), { price: 512, currency: "USD" });
  assert.equal(readFreshDiscoveryFare({ ...fresh, priceState: "last_known_good" }, item), undefined);
  assert.equal(readFreshDiscoveryFare({ ...fresh, fare: { ...fresh.fare, providerBacked: false } }, item), undefined);
  assert.equal(readFreshDiscoveryFare({ ...fresh, fare: { ...fresh.fare, code: "DXB" } }, item), undefined);
  assert.equal(readFreshDiscoveryFare({ ...fresh, fare: { ...fresh.fare, expiresAt: "2020-01-01T00:00:00.000Z" } }, item), undefined);
  assert.doesNotMatch(section, /priceFromUsd/);
});

test("cards form a responsive two-column grid with safe image fallback", () => {
  assert.match(section, /\(width - 28 - GRID_GAP\) \/ 2/);
  assert.match(section, /flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP/);
  assert.doesNotMatch(section, /ScrollView|horizontal/);
  assert.match(section, /onError=\{onImageError\}/);
  assert.match(section, /testID=\{`adventure-image-fallback-\$\{item\.id\}`\}/);
  assert.match(section, /accessibilityRole="button"/);
});
