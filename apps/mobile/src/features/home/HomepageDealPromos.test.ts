import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const promo = source("src/features/home/HomepageDealPromos.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");

test("both homepage deal cards render their complete promotional copy", () => {
  assert.match(promo, /Flight deals from top airlines/);
  assert.match(promo, /Discover limited-time fares and compare options instantly\./);
  assert.match(promo, /Explore flight deals/);
  assert.match(promo, /Hotel savings worldwide/);
  assert.match(promo, /Browse stays from boutique hotels to global chains with price transparency\./);
  assert.match(promo, /Explore hotel deals/);
});

test("deal cards reuse vector icons and navigate only to supported product routes", () => {
  assert.match(promo, /icon: "flight"/);
  assert.match(promo, /icon: "hotel"/);
  assert.match(promo, /<FlowIcon name=\{promo\.icon\}/);
  assert.match(promo, /route: "\/flights"/);
  assert.match(promo, /route: "\/hotels"/);
  assert.doesNotMatch(promo, /require\(|\.(?:png|jpe?g|gif|webp)/i);
});

test("promos follow all existing discovery sections for every home session", () => {
  const popular = home.indexOf("<PopularDestinationStays />");
  const adventure = home.indexOf("<DiscoverNextAdventure />");
  const promos = home.indexOf("<HomepageDealPromos />");

  assert.ok(popular !== -1 && popular < adventure && adventure < promos);
  assert.equal(home.match(/<HomepageDealPromos \/>/g)?.length, 1);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*HomepageDealPromos/s);
});

test("promos remain homepage-only and no third planning section is added", () => {
  for (const route of ["../flow/ProductScreens.tsx", "../flow/TabScreens.tsx"]) {
    assert.doesNotMatch(source(`src/features/home/${route}`), /HomepageDealPromos/);
  }
  assert.doesNotMatch(`${promo}\n${home}`, /Start planning your trip around the world/i);
});

test("homepage promo implementation adds no binary assets", () => {
  const binaryExtensions = /\.(?:png|jpe?g|gif|webp|bmp|ico)$/i;
  const files = readdirSync(join(process.cwd(), "src/features/home"));
  assert.deepEqual(files.filter((file) => statSync(join(process.cwd(), "src/features/home", file)).isFile() && binaryExtensions.test(file)), []);
});
