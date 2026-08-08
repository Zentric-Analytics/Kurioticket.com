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
    "<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker />",
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

test("Popular destination stays is completely absent from mobile Home", () => {
  assert.doesNotMatch(home, /PopularDestinationStays|Popular destination stays/);
  assert.match(
    home,
    /<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker \/>\s*<HomepageAdventureDiscovery \/>\s*<HomepageDealPromos \/>\s*<RegionalDestinationRoutes \/>/,
  );
});
