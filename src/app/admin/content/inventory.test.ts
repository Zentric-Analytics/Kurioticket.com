import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getCarPickupCardSummary } from "./car-pickup-cards/page-data";
import { getFaqInventorySummary } from "./faqs/page-data";
import { getFlightRouteInventorySummary } from "./flight-routes/page-data";
import { getHomepageDestinationSummary } from "./homepage-destinations/page-data";
import { getHomepageTrustMessageSummary } from "./homepage-trust-messages/page-data";
import { getHotelDestinationSummary } from "./hotel-destinations/page-data";
import {
  contentInventoryRoutes,
  getContentInventory,
  getContentInventoryCategory,
  type ContentInventoryCategoryId,
} from "./inventory";

const inventory = getContentInventory();

const contracts: Array<{
  id: ContentInventoryCategoryId;
  title: string;
  href: string;
  primaryCount: number;
  unit: string;
  inspectionTotal: number;
}> = [
  { id: "homepage-destinations", title: "Homepage destination content", href: "/admin/content/homepage-destinations", primaryCount: 168, unit: "unique card IDs", inspectionTotal: getHomepageDestinationSummary().uniqueCardIds },
  { id: "flight-routes", title: "Configured flight fare routes", href: "/admin/content/flight-routes", primaryCount: 340, unit: "Unique route IDs", inspectionTotal: getFlightRouteInventorySummary().uniqueRouteIds },
  { id: "hotel-destinations", title: "Hotel search destinations", href: "/admin/content/hotel-destinations", primaryCount: 83, unit: "search destinations", inspectionTotal: getHotelDestinationSummary().total },
  { id: "car-pickup-cards", title: "Car pickup cards", href: "/admin/content/car-pickup-cards", primaryCount: 4, unit: "pickup cards", inspectionTotal: getCarPickupCardSummary().pickupCards },
  { id: "faqs", title: "FAQ definitions", href: "/admin/content/faqs", primaryCount: 21, unit: "total definitions", inspectionTotal: getFaqInventorySummary().total },
  { id: "homepage-trust-messages", title: "Homepage trust messages", href: "/admin/content/homepage-trust-messages", primaryCount: 3, unit: "trust messages", inspectionTotal: getHomepageTrustMessageSummary().messages },
];

function supportingValue(id: ContentInventoryCategoryId, label: string) {
  const metric = getContentInventoryCategory(id).supportingMetrics.find((item) => item.label === label);
  assert.ok(metric, `Missing supporting metric: ${id} / ${label}`);
  return metric.value;
}

test("all Content Inventory categories satisfy the stable ID, route, and canonical summary contract", () => {
  assert.equal(inventory.length, contracts.length);
  for (const expected of contracts) {
    const category = getContentInventoryCategory(expected.id);
    assert.equal(category.id, expected.id);
    assert.equal(category.title, expected.title);
    assert.equal(category.href, expected.href);
    assert.equal(category.href, contentInventoryRoutes[expected.id]);
    assert.equal(category.primaryCount, expected.primaryCount);
    assert.equal(category.primaryCount, expected.inspectionTotal);
    assert.equal(category.unit, expected.unit);
  }
});

test("category IDs and inspection hrefs are unique", () => {
  assert.equal(new Set(inventory.map((item) => item.id)).size, 6);
  assert.equal(new Set(inventory.map((item) => item.href)).size, 6);
});

test("category lookup is stable when visible title presentation copy changes", () => {
  const category = getContentInventoryCategory("flight-routes");
  category.title = "Changed presentation title";
  assert.equal(getContentInventoryCategory("flight-routes").primaryCount, 340);
});

test("inspection pages do not locate category summaries through visible title text", () => {
  const pages = contracts.map(({ id }) => readFileSync(`src/app/admin/content/${id}/page.tsx`, "utf8")).join("\n");
  assert.doesNotMatch(pages, /find\([^)]*(?:\.title|title\s*===)/s);
  assert.doesNotMatch(pages, /getContentInventory\(\)\.find/);
});

test("homepage and flight supporting metrics retain their audited distinctions", () => {
  assert.equal(supportingValue("homepage-destinations", "Configured market assignments"), 272);
  assert.equal(supportingValue("homepage-destinations", "Unique origin/destination routes"), 146);
  const flights = getFlightRouteInventorySummary();
  assert.equal(supportingValue("flight-routes", "Pool memberships"), flights.poolMemberships);
  assert.equal(flights.uniqueRouteIds, 340);
  assert.equal(flights.poolMemberships, 596);
  assert.equal(supportingValue("flight-routes", "Default-US routes"), 48);
  assert.equal(supportingValue("flight-routes", "Global routes"), 32);
});

test("inventory retains source, public-state, and scope terminology", () => {
  assert.equal(getContentInventoryCategory("flight-routes").publicState, "Configured");
  assert.match(getContentInventoryCategory("hotel-destinations").note, /Search and autocomplete destinations/);
  assert.match(getContentInventoryCategory("faqs").note, /localized at runtime/);
  assert.match(getContentInventoryCategory("homepage-trust-messages").note, /other trust-content surfaces are not included/);
  for (const item of inventory) {
    assert.equal(item.sourceType, "Code-backed");
    assert.ok(["Public", "Configured"].includes(item.publicState));
    assert.doesNotMatch(`${item.publicState} ${item.note}`, /Read-only|Not live yet|Placeholder|available for review/i);
  }
});
