import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminNavigation } from "@/lib/adminNavigation";
import { filterProviderStatuses, normalizeProductFilter, productFilters } from "@/lib/adminProviderFilters";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const providerFiltersSource = readFileSync("src/lib/adminProviderFilters.ts", "utf8");
const flightsPage = readFileSync("src/app/admin/flights/page.tsx", "utf8");
const hotelsPage = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const carsPage = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const providersApi = readFileSync("src/app/api/admin/providers/route.ts", "utf8");
const providerRetestApi = readFileSync("src/app/api/admin/providers/duffel/retest/route.ts", "utf8");
const overviewPage = readFileSync("src/app/admin/page.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");

type TestProvider = Parameters<typeof filterProviderStatuses>[0][number];

const providerStatuses = [
  provider("Flights", "Duffel"),
  provider("Hotels", "Hotelbeds"),
  provider("Cars", "Not connected"),
];

test("providers page defaults invalid and missing product filters to all", () => {
  assert.equal(normalizeProductFilter(), "all");
  assert.equal(normalizeProductFilter("all"), "all");
  assert.equal(normalizeProductFilter("unknown"), "all");
  assert.equal(normalizeProductFilter(["cars", "flights"]), "cars");
});

test("providers page filters provider sections by product query", () => {
  assert.deepEqual(filterProviderStatuses(providerStatuses, "all").map((item) => item.product), ["Flights", "Hotels", "Cars"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "flights").map((item) => item.product), ["Flights"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "hotels").map((item) => item.product), ["Hotels"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "cars").map((item) => item.product), ["Cars"]);
});

test("providers page exposes accessible server-rendered product filter links", () => {
  assert.deepEqual(productFilters.map((filter) => filter.key), ["all", "flights", "hotels", "cars"]);
  assert.match(providersPage, /aria-label="Provider product filter"/);
  assert.match(providersPage, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=flights"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=hotels"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=cars"/);
  assert.match(providersPage, /getProviderStatuses\(\)/);
  assert.match(providersPage, /<AdminProviderStatusCard \{\.\.\.provider\} \/>/);
});

test("providers page preserves provider data, product guidance, and Duffel-only retest control", () => {
  assert.match(providersPage, /Provider health retest/);
  assert.match(providersPage, /<ProviderRetestButton \/>/);
  assert.match(providersPage, /Duffel only/);
  assert.match(providersPage, /Flight search visibility comes from real search logs/);
  assert.match(providersPage, /Hotel inventory, ratings, confirmations, and bookings/);
  assert.match(providersPage, /No fake car provider inventory/);
});

test("admin navigation keeps Providers and removes duplicate product destinations only", () => {
  const labels = adminNavigation.map((item) => item.label);
  assert.ok(labels.includes("Providers"));
  assert.equal(labels.includes("Flights"), false);
  assert.equal(labels.includes("Hotels"), false);
  assert.equal(labels.includes("Cars"), false);
  assert.deepEqual(labels, ["Overview", "Users", "Bookings", "Support", "Account Deletions", "Providers", "Searches", "Provider Handoffs", "Admin Logs", "Content", "System", "Settings"]);
});

test("legacy admin product pages are server redirects and no longer render duplicate provider cards", () => {
  assert.match(flightsPage, /redirect\("\/admin\/providers\?product=flights"\)/);
  assert.match(hotelsPage, /redirect\("\/admin\/providers\?product=hotels"\)/);
  assert.match(carsPage, /redirect\("\/admin\/providers\?product=cars"\)/);

  for (const source of [flightsPage, hotelsPage, carsPage]) {
    assert.doesNotMatch(source, /AdminProviderStatusCard/);
    assert.doesNotMatch(source, /getProviderStatuses/);
    assert.doesNotMatch(source, /AdminPageShell/);
  }
});

test("provider APIs, retest API, and unrelated admin pages are not edited by provider page consolidation", () => {
  assert.match(providersApi, /return NextResponse\.json\(\{ active: \{ duffel: await getDuffelAdminHealth\(\) \}, paused: pausedProviderRows \}\)/);
  assert.match(providerRetestApi, /checkDuffelHealth\(\)/);
  assert.match(providerRetestApi, /writeAdminAuditLog/);
  assert.match(overviewPage, /Operations Dashboard/);
  assert.match(systemPage, /Safe operational status only/);
  assert.match(settingsPage, /Read-only operational settings/);
});

function provider(product: TestProvider["product"], providerName: string): TestProvider {
  return {
    product,
    providerName,
    environment: "Test mode",
    credentialsPresent: true,
    searchEnabled: true,
    bookingEnabled: false,
    lastSuccessfulRequest: "2026-07-16 10:00 UTC",
    lastFailedRequest: null,
    notes: `${product} provider notes`,
  };
}
