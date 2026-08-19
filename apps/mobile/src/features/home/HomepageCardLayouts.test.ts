import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const home = readFileSync(
  join(process.cwd(), "src/features/flow/HomeFlowScreen.tsx"),
  "utf8",
);

test("mobile Home keeps every remaining section in the required order", () => {
  const orderedSections = [
    "<HomeHero />",
    "<View style={[styles.products, { backgroundColor: ft.colors.card }, ft.styles.shadow]}>",
    "{searchPanel[activeProduct]}",
    "<PopularDestinationStays />",
    "<HomepageAdventureDiscovery />",
    "<HomepageDealPromos />",
    "<RegionalDestinationRoutes />",
  ];

  let cursor = -1;
  for (const section of orderedSections) {
    const index = home.indexOf(section);
    assert.ok(index > cursor, `${section} follows the previous Home section`);
    assert.equal(home.split(section).length - 1, 1, `${section} renders once`);
    cursor = index;
  }
});

test("Popular destination stays is directly between the active search panel and adventure discovery", () => {
  assert.match(
    home,
    /\{searchPanel\[activeProduct\]\}\s*<PopularDestinationStays \/>\s*<HomepageAdventureDiscovery \/>\s*<HomepageDealPromos \/>\s*<RegionalDestinationRoutes \/>/,
  );
});
