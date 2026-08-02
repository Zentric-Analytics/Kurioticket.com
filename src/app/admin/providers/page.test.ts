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

test("provider filter helpers remain available while the restored page shows all providers", () => {
  assert.deepEqual(productFilters.map((filter) => filter.key), ["all", "flights", "hotels", "cars"]);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=flights"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=hotels"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=cars"/);
  assert.match(providersPage, /getProviderStatuses\(\)/);
  assert.match(providersPage, /<AdminProviderStatusCard key=\{provider\.product\} \{\.\.\.provider\} \/>/);
});

test("providers page preserves truthful provider data and the active retest control", () => {
  assert.match(providersPage, /Provider health retest/);
  assert.match(providersPage, /<ProviderRetestButton \/>/);
  assert.match(providersPage, /Retesting records real provider health/);
  assert.match(providersPage, /Cars pending unless configured/);
  assert.match(providersPage, /Secrets hidden/);
});

test("admin navigation restores Providers and the original product destinations", () => {
  assert.equal(adminNavigation.some((item) => item.href === "/admin/providers" && item.label === "Providers"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/flights" && item.label === "Flights"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/hotels" && item.label === "Hotels"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/cars" && item.label === "Cars"), true);
});

test("restored product operations pages retain their product-specific readiness views", () => {
  assert.match(flightsPage, /title="Flight Operations"/);
  assert.match(hotelsPage, /title="Hotel Operations"/);
  assert.match(carsPage, /title="Car Operations"/);
  for (const source of [flightsPage, hotelsPage, carsPage]) assert.match(source, /AdminProviderStatusCard/);
});

test("provider APIs, retest API, and unrelated admin pages are not edited by provider page consolidation", () => {
  assert.match(providersApi, /return NextResponse\.json\(\{ active: \{ duffel: await getDuffelAdminHealth\(\) \}, paused: pausedProviderRows \}\)/);
  assert.match(providerRetestApi, /checkDuffelHealth\(\)/);
  assert.match(providerRetestApi, /writeAdminAuditLog/);
  assert.match(overviewPage, /Operations Dashboard/);
  assert.match(systemPage, /Safe operational status only/);
  assert.match(settingsPage, /AdminPageShell title="Settings"/);
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
