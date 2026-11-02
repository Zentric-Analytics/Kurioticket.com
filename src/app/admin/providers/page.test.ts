import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminNavigation } from "@/lib/adminNavigation";
import { filterProviderOperationalStatuses, filterProviderStatuses, normalizeProductFilter, productFilters } from "@/lib/adminProviderFilters";
import type { ProviderOperationalStatus, ProviderOperationalServiceStatus } from "@/services/providerOperationalStatusCore";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const directoryTable = readFileSync("src/components/admin/ProviderDirectoryTable.tsx", "utf8");
const retestButton = readFileSync("src/components/admin/ProviderRetestButton.tsx", "utf8");
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
  provider("Hotels", "Kurioticket static catalogue"),
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

test("provider filter helpers drive the providers page", () => {
  assert.deepEqual(productFilters.map((filter) => filter.key), ["all", "flights", "hotels", "cars"]);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=flights"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=hotels"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=cars"/);
  assert.match(providersPage, /normalizeProductFilter/);
  assert.match(providersPage, /filterProviderStatuses/);
  assert.match(providersPage, /productFilters\.map/);
  assert.match(providersPage, /getProviderStatuses\(\)/);
  assert.match(providersPage, /getProviderOperationalStatuses\(\)/);
  assert.match(providersPage, /All providers/);
  assert.match(providersPage, /filterProviderOperationalStatuses/);
});

test("provider details preserve booking, readiness and audited Duffel retest", () => {
  assert.match(providersPage, /<ProviderDirectoryTable rows=\{directoryRows\} \/>/);
  assert.match(providersPage, /canRetestDuffel: integration\.id === "duffel"/);
  assert.match(directoryTable, /<ProviderRetestButton \/>/);
  assert.match(directoryTable, /row\.canRetestDuffel/);
  assert.match(directoryTable, /row\.detail\.configured/);
  assert.match(directoryTable, /row\.detail\.booking/);
  assert.match(directoryTable, /row\.detail\.note/);
  assert.match(directoryTable, /row\.detail\.lastFailure/);
  assert.match(directoryTable, /records an admin audit event/);
  assert.match(retestButton, /router\.refresh\(\)/);
  assert.match(retestButton, /catch/);
  assert.match(retestButton, /finally/);
  assert.doesNotMatch(retestButton, /window\.location\.reload/);
  assert.doesNotMatch(providersPage, /Provider health checks/);
});

test("admin navigation restores Providers and the original product destinations", () => {
  assert.equal(adminNavigation.some((item) => item.href === "/admin/providers" && item.label === "Providers"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/flights" && item.label === "Flights"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/hotels" && item.label === "Hotels"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/cars" && item.label === "Cars"), true);
});

test("product pages retain truthful metasearch and provider health views", () => {
  assert.match(flightsPage, /title="Flight Operations"/);
  assert.match(hotelsPage, /title="Hotel Operations"/);
  assert.match(carsPage, /title="Car Operations"/);
  assert.match(flightsPage, /AdminProviderStatusCard/);
  // Hotel and Car Operations now own their own provider-health sections,
  // rather than reusing the older generic readiness card.
  for (const source of [hotelsPage, carsPage]) {
    assert.match(source, /getProviderIntegrationStatuses/);
    assert.match(source, /providerHealth\.find/);
    assert.match(source, /AdminSectionCard/);
  }
  for (const source of [flightsPage, hotelsPage, carsPage]) {
    assert.match(source, /provider-owned/i);
    assert.doesNotMatch(source, /Booking not live|production booking workflow|booking actions/i);
  }
});

test("provider APIs, retest API, and unrelated admin pages are not edited by provider page consolidation", () => {
  assert.match(providersApi, /getProviderOperationalStatuses/);
  assert.match(providerRetestApi, /checkDuffelHealth\(\)/);
  assert.match(providerRetestApi, /writeAdminAuditLog/);
  assert.match(overviewPage, /Operations Dashboard/);
  assert.match(systemPage, /Safe operational status only/);
  assert.match(settingsPage, /<AdminPageShell\s+title="Settings"/);
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


test("provider health sections prioritize attention and use a flat compact layout", () => {
  const positions = [
    "Providers requiring attention",
    "All providers",
    "Operational performance",
    "Search service breakdown",
  ].map(section => providersPage.indexOf(section));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(providersPage, /getProviderIntegrationStatuses/);
  assert.match(providersPage, /<h1 className="sr-only">Providers<\/h1>/);
  assert.doesNotMatch(providersPage, /Monitor provider availability, search reliability/);
  assert.doesNotMatch(providersPage, /<header>/);
  assert.doesNotMatch(providersPage, /AdminSectionCard/);
  assert.match(providersPage, /<ProviderDirectoryTable rows=/);
  assert.match(providersPage, /aria-labelledby="service-breakdown-heading"/);
});

test("provider issue link expands inline and cannot jump to the bottom", () => {
  assert.match(providersPage, /<details className="group py-3">/);
  assert.match(providersPage, /View details ›/);
  assert.match(providersPage, /Hide details ‹/);
  assert.match(providersPage, /service\.failureReasons/);
  assert.match(providersPage, /<ActivityTime value=\{provider\.lastFailureAt\}/);
  assert.match(providersPage, /unscopedTimingProviders\.has\(provider\.id\)/);
  assert.match(providersPage, /Not recorded in the last 24 hours/);
  assert.match(providersPage, /Not available for this service/);
  assert.doesNotMatch(providersPage, /href=\{"#provider-operation-" \+ provider\.id\}/);
});

test("directory rows are compact and disclose secondary diagnostics on request", () => {
  assert.match(directoryTable, /aria-expanded=\{open\}/);
  assert.match(directoryTable, /aria-controls=\{"provider-details-" \+ row\.id\}/);
  assert.match(directoryTable, /hidden=\{!open\}/);
  assert.match(directoryTable, /row\.shortLabel/);
  assert.match(directoryTable, /row\.lastActivity/);
  assert.doesNotMatch(directoryTable, /Credentials: Yes/);
  assert.doesNotMatch(directoryTable, /Booking: Not live yet/);
  assert.match(providersPage, /shortLabel: "Internal catalogue"/);
  assert.match(providersPage, /shortLabel: integration\.id === "duffel"/);
  assert.match(directoryTable, /Not externally monitored|row\.lastActivity/);
});

test("performance table has concise rows, an attempted-calls tooltip and aligned service columns", () => {
  assert.match(providersPage, /Disabled calls are not counted as attempts\./);
  assert.match(providersPage, /<Info size=\{13\}/);
  assert.doesNotMatch(providersPage, /Recorded external provider calls in the current environment/);
  assert.doesNotMatch(providersPage, /Product filtering uses service-specific counts/);
  assert.doesNotMatch(providersPage, /Last success: <ActivityTime/);
  assert.doesNotMatch(providersPage, /Last failure: <ActivityTime/);
  assert.match(providersPage, /Failure reason/);
  assert.match(providersPage, /numberHeadingClass/);
  assert.match(providersPage, /service\.disabledCalls\.toLocaleString\(\)/);
  assert.match(providersPage, /service\.failureRatePct === null \? "No attempts"/);
});


test("product filtering retains truthful timing metrics for a single-service provider", () => {
  const flight: ProviderOperationalServiceStatus = {
    service: "flight-search",
    operationalState: "HEALTHY",
    totalCalls: 2,
    attemptedCalls: 2,
    successCalls: 2,
    degradedCalls: 0,
    failedCalls: 0,
    disabledCalls: 0,
    failureRatePct: 0,
    failureReasons: [],
  };
  const duffel: ProviderOperationalStatus = {
    id: "duffel",
    provider: "Duffel",
    readinessState: "READY",
    operationalState: "HEALTHY",
    windowHours: 24,
    totalCalls: 2,
    attemptedCalls: 2,
    successCalls: 2,
    degradedCalls: 0,
    failedCalls: 0,
    disabledCalls: 0,
    failureRatePct: 0,
    serviceBreakdown: [flight],
    averageLatencyMs: 1500,
    lastActivityAt: "2026-11-02T08:00:00.000Z",
    lastSuccessAt: "2026-11-02T08:00:00.000Z",
    lastFailureAt: null,
    lastAdverseAt: null,
  };
  const selected = filterProviderOperationalStatuses([duffel], "flights");
  assert.equal(selected.length, 1);
  assert.equal(selected[0].averageLatencyMs, 1500);
  assert.equal(selected[0].lastActivityAt, duffel.lastActivityAt);
  assert.equal(selected[0].lastSuccessAt, duffel.lastSuccessAt);
  assert.equal(filterProviderOperationalStatuses([duffel], "hotels").length, 0);

  // Combined timings cannot honestly be attributed to one service.
  const kayak: ProviderOperationalStatus = {
    ...duffel,
    id: "kayak-sandbox",
    provider: "KAYAK sandbox",
    serviceBreakdown: [
      flight,
      {...flight, service: "hotel-search", attemptedCalls: 3, successCalls: 3, totalCalls: 3},
      {...flight, service: "car-search", attemptedCalls: 0, successCalls: 0, totalCalls: 0, failureRatePct: null},
    ],
    attemptedCalls: 5,
    successCalls: 5,
    totalCalls: 5,
  };
  const kayakFlights = filterProviderOperationalStatuses([kayak], "flights")[0];
  assert.equal(kayakFlights.attemptedCalls, 2);
  assert.equal(kayakFlights.averageLatencyMs, null);
  assert.equal(kayakFlights.lastActivityAt, null);
  assert.equal(kayakFlights.lastSuccessAt, null);
});
