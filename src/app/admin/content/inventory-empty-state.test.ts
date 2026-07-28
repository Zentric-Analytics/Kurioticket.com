import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { filterFaqInventoryRows, parseFaqInventorySearchParams, selectFaqInventoryRows } from "./faqs/page-data";
import { filterFlightRouteRows, getFlightRouteInventoryRows, parseFlightRouteSearchParams } from "./flight-routes/page-data";
import { filterHomepageDestinationRows, getHomepageDestinationInventoryRows, parseHomepageDestinationSearchParams } from "./homepage-destinations/page-data";
import { filterHotelDestinationRows, getHotelDestinationInventoryRows, parseHotelDestinationSearchParams } from "./hotel-destinations/page-data";
import { getInventoryEmptyState } from "./inventory-empty-state";
import { getContentInventory } from "./inventory";

const cases = [
  {
    name: "homepage destinations",
    rows: getHomepageDestinationInventoryRows(),
    filter: (q: string) => filterHomepageDestinationRows(getHomepageDestinationInventoryRows(), parseHomepageDestinationSearchParams({ q })),
    page: "src/app/admin/content/homepage-destinations/page.tsx",
    title: "No destination assignments match",
    message: "Adjust the search or filters to view configured homepage destination assignments.",
    sourceTitle: "No destination assignments are configured",
    sourceMessage: "No homepage destination assignment records are configured.",
    href: "/admin/content/homepage-destinations",
  },
  {
    name: "flight routes",
    rows: getFlightRouteInventoryRows(),
    filter: (q: string) => filterFlightRouteRows(getFlightRouteInventoryRows(), parseFlightRouteSearchParams({ q })),
    page: "src/app/admin/content/flight-routes/page.tsx",
    title: "No pool memberships match",
    message: "Adjust the search or filters to view configured flight-route pool memberships.",
    sourceTitle: "No pool memberships are configured",
    sourceMessage: "No flight-route pool membership records are configured.",
    href: "/admin/content/flight-routes",
  },
  {
    name: "hotel destinations",
    rows: getHotelDestinationInventoryRows(),
    filter: (q: string) => filterHotelDestinationRows(getHotelDestinationInventoryRows(), parseHotelDestinationSearchParams({ q })),
    page: "src/app/admin/content/hotel-destinations/page.tsx",
    title: "No hotel destinations match",
    message: "Adjust the search or filters to view configured hotel search destinations.",
    sourceTitle: "No hotel destinations are configured",
    sourceMessage: "No hotel search destination records are configured.",
    href: "/admin/content/hotel-destinations",
  },
  {
    name: "FAQs",
    rows: selectFaqInventoryRows(),
    filter: (q: string) => filterFaqInventoryRows(selectFaqInventoryRows(), parseFaqInventorySearchParams({ q })),
    page: "src/app/admin/content/faqs/page.tsx",
    title: "No FAQ definitions match",
    message: "Adjust the search or classification filter to view configured FAQ definitions.",
    sourceTitle: "No FAQ definitions are configured",
    sourceMessage: "No FAQ definition records are configured.",
    href: "/admin/content/faqs",
  },
];

for (const inventory of cases) {
  test(`${inventory.name} distinguishes matching, filtered-empty, and source-empty records`, () => {
    assert.ok(inventory.rows.length > 0);
    assert.ok(inventory.filter("").length > 0, "matching records continue to reach the table");
    const matches = inventory.filter("definitely-no-inventory-record-matches-this");
    assert.equal(matches.length, 0);

    assert.deepEqual(getInventoryEmptyState(inventory.rows.length, matches.length, true, {
      filteredTitle: inventory.title,
      filteredMessage: inventory.message,
      sourceTitle: inventory.sourceTitle,
      sourceMessage: inventory.sourceMessage,
    }), { title: inventory.title, message: inventory.message, showClearFilters: true });

    assert.deepEqual(getInventoryEmptyState(0, 0, false, {
      filteredTitle: inventory.title,
      filteredMessage: inventory.message,
      sourceTitle: inventory.sourceTitle,
      sourceMessage: inventory.sourceMessage,
    }), { title: inventory.sourceTitle, message: inventory.sourceMessage, showClearFilters: false });
  });

  test(`${inventory.name} wires its empty state to the bare clear-filter route`, () => {
    const page = readFileSync(inventory.page, "utf8");
    assert.ok(page.includes("{emptyState ? ("), "the table is replaced rather than rendered empty");
    assert.ok(page.includes("<AdminEmptyState"));
    assert.ok(page.includes(`href="${inventory.href}"`));
    assert.ok(page.indexOf("FilterToolbar") < page.indexOf("{emptyState ? ("), "toolbar stays above the results state");
  });
}

test("main inventory preserves all six stable category IDs and routes", () => {
  const inventory = getContentInventory();
  const page = readFileSync("src/app/admin/content/page.tsx", "utf8");
  assert.equal(inventory.length, 6);
  assert.equal(new Set(inventory.map((area) => area.id)).size, 6);
  for (const area of inventory) assert.match(area.href, /^\/admin\/content\//);
  assert.ok(page.includes('eyebrow=""'));
  assert.ok(page.includes("key={area.id}"));
  assert.ok(page.includes("flex h-full flex-col"));
  assert.ok(page.includes("mt-auto"));
  assert.ok(page.includes("flex-col items-start gap-3 sm:flex-row"));
});
