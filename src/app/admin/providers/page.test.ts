import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminNavigation } from "@/lib/adminNavigation";
import { getProviderOutcomeWidths } from "@/lib/adminProviderVisuals";
import { providerHandoffFiltersHref, providerHandoffHistoryFilterHref, shouldAcceptHandoffFilterResponse } from "@/lib/adminProviderHandoffFilterUrl";
import { filterProviderOperationalStatuses, filterProviderStatuses, normalizeProductFilter, productFilters } from "@/lib/adminProviderFilters";
import type { ProviderOperationalStatus, ProviderOperationalServiceStatus } from "@/services/providerOperationalStatusCore";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const referralPage = readFileSync("src/app/admin/referral-attribution/page.tsx", "utf8");
const referralWindowFilter = readFileSync("src/components/admin/ReferralWindowFilter.tsx", "utf8");
const handoffFilters = readFileSync("src/components/admin/ProviderHandoffFilters.tsx", "utf8");
const handoffsPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");
const handoffDetailPage = readFileSync("src/app/admin/redirects/[id]/page.tsx", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
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
  assert.match(providersPage, /getProviderOperationalStatuses\(monitoringHours\)/);
  assert.match(providersPage, /All providers/);
  assert.match(providersPage, /filterProviderOperationalStatuses/);
});

test("provider details preserve booking, readiness and audited Duffel retest", () => {
  assert.match(providersPage, /<ProviderDirectoryTable rows=\{directoryRows\} \/>/);
  assert.match(providersPage, /canRetestDuffel: integration\.id === "duffel"/);
  assert.match(directoryTable, /<ProviderRetestButton \/>/);
  assert.match(directoryTable, /row\.canRetestDuffel/);
  assert.match(directoryTable, /sm:grid-cols-2 lg:grid-cols-4/);
  assert.doesNotMatch(directoryTable, /xl:grid-cols-4/);
  assert.doesNotMatch(directoryTable, /A retest makes a real Duffel health request/);
  assert.match(directoryTable, /row\.detail\.configured/);
  assert.match(directoryTable, /row\.detail\.booking/);
  assert.match(directoryTable, /row\.detail\.note/);
  assert.match(directoryTable, /row\.detail\.lastFailure/);
  assert.match(providerRetestApi, /writeAdminAuditLog/);
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

test("provider attention supports truthful history windows and provider-search investigation", () => {
  assert.match(providersPage, /parseProviderHealthHours\(raw\.hours\)/);
  assert.match(providersPage, /getProviderOperationalStatuses\(monitoringHours\)/);
  assert.match(providersPage, /providerHealthWindows\.map\(window =>/);
  assert.match(providersPage, /providerHealthHref\(monitoringHours, item\.key\)/);
  assert.match(providersPage, /Provider health signals \(historical\)/);
  assert.match(providersPage, /providerSearchActivityHref\(/);
  assert.match(providersPage, /Review provider searches/);
  assert.match(providersPage, /Provider calls can occur outside these search dates/);
  assert.match(providersPage, /getProviderOperationalStatuses\(monitoringHours\)\.catch\(\(\) => null\)/);
});

test("provider issue link expands inline and cannot jump to the bottom", () => {
  assert.match(providersPage, /<details className="group py-2\.5">/);
  assert.match(providersPage, /View details ›/);
  assert.match(providersPage, /Hide details ‹/);
  assert.match(providersPage, /service\.failureReasons/);
  assert.match(providersPage, /<ActivityTime value=\{provider\.lastFailureAt\}/);
  assert.match(providersPage, /unscopedTimingProviders\.has\(provider\.id\)/);
  assert.match(providersPage, /Not recorded in /);
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

test("performance visualization preserves call counts, an attempted-calls hint and aligned service diagnostics", () => {
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
  assert.match(providersPage, /getProviderOutcomeWidths\(provider\)/);
  assert.match(providersPage, /aria-label="Provider call outcome comparison"/);
  assert.match(providersPage, /segments\.successPct/);
  assert.match(providersPage, /segments\.failurePct/);
  assert.match(providersPage, /segments\.degradedPct/);
  assert.match(providersPage, /segments\.hasAttempts/);
  assert.match(providersPage, /provider\.averageLatencyMs/);
  assert.match(providersPage, /provider\.attemptedCalls\.toLocaleString/);
  assert.match(providersPage, /provider\.degradedCalls\.toLocaleString/);
  assert.doesNotMatch(providersPage, /<table className="w-full min-w-\[790px\]/);
});

test("attention uses state-dependent incident accents without inserting cards", () => {
  assert.match(providersPage, /border-l-\[3px\]/);
  assert.match(providersPage, /"border-rose-500" : "border-amber-500"/);
  assert.match(providersPage, /<ul className="mt-3 space-y-2">/);
  assert.match(providersPage, /border-t border-\[#E7ECF5\] pt-3/);
  assert.doesNotMatch(providersPage, /AdminSectionCard/);
  assert.match(providersPage, /<ProviderDirectoryTable rows=\{directoryRows\} \/>/);
  assert.match(providersPage, /mt-6 border-t border-\[#E7ECF5\] pt-4 text-\[12px\]/);
});

test("provider outcome bars reconcile attempted calls without treating disabled calls as successes", () => {
  assert.deepEqual(getProviderOutcomeWidths({
    attemptedCalls: 20, successCalls: 12, failedCalls: 5, degradedCalls: 3,
  }), {
    hasAttempts: true, successPct: 60, failurePct: 25, degradedPct: 15,
  });
  assert.deepEqual(getProviderOutcomeWidths({
    attemptedCalls: 0, successCalls: 0, failedCalls: 0, degradedCalls: 0,
  }), {
    hasAttempts: false, successPct: 0, failurePct: 0, degradedPct: 0,
  });
  assert.deepEqual(getProviderOutcomeWidths({
    attemptedCalls: 10000, successCalls: 9999, failedCalls: 1, degradedCalls: 0,
  }), {
    hasAttempts: true, successPct: 99.99, failurePct: 0.01, degradedPct: 0,
  });
  assert.throws(() => getProviderOutcomeWidths({
    attemptedCalls: 20, successCalls: 20, failedCalls: 1, degradedCalls: 0,
  }), /must reconcile/);
});


test("Task 1: incident details show compact facts and aligned per-service diagnostics", () => {
  assert.match(providersPage, /grid max-w-\[980px\] gap-x-5 gap-y-3 sm:grid-cols-3/);
  assert.match(providersPage, /<ActivityTime value=\{provider\.lastFailureAt\}/);
  assert.match(providersPage, /<ActivityTime value=\{provider\.lastSuccessAt\}/);
  assert.match(providersPage, /aria-label=\{"Service diagnostics for " \+ provider\.provider\}/);
  assert.match(providersPage, /<table className="w-full min-w-\[760px\] table-fixed/);
  for (const column of ["Service", "Status", "Attempts", "Failed", "Main failure reason"]) {
    assert.ok(providersPage.includes(">" + column + "</th>"), "Missing incident diagnostic column: " + column);
  }
  assert.match(providersPage, /service\.failureReasons\.map\(reason =>/);
  assert.match(providersPage, /service\.attemptedCalls === 0 \? "No attempts"/);
  assert.match(providersPage, /border-l-\[3px\]/);
  assert.match(providersPage, /<details className="group py-2\.5">/);
});

test("Task 2: breakdown reasons are stacked with aligned counts, not comma-joined sentences", () => {
  assert.match(providersPage, /aria-label=\{"Failure reasons for " \+ provider\.provider/);
  assert.match(providersPage, /<ul aria-label=\{"Failure reasons for "/);
  assert.match(providersPage, /<li key=\{reason\.code\}/);
  assert.match(providersPage, /reason\.calls\.toLocaleString\(\)/);
  assert.match(providersPage, /justify-between gap-3/);
  assert.match(providersPage, /service\.failureReasons\.length \? \(/);
  assert.match(providersPage, /: "—"/);
  assert.match(providersPage, /aria-labelledby="service-breakdown-heading"/);
});

test("Task 3: referral attribution uses compact preset auto-apply and white metric summaries", () => {
  assert.match(referralPage, /requireAdminApiSession\(\)/);
  assert.match(referralPage, /parseAttributionDays\(daysValue\)/);
  assert.match(referralPage, /getReferralAttributionSummary\(days, environment\)/);
  assert.match(referralPage, /<ReferralWindowFilter days=\{days\} embedded=\{false\} \/>/);
  assert.match(referralWindowFilter, /router\.replace\(target, \{ scroll: false \}\)/);
  assert.match(referralWindowFilter, /name="days"/);
  assert.match(referralWindowFilter, /name="view" value="attribution"/);
  for (const window of ["7","14","30","60","90"]) {
    assert.match(referralWindowFilter, new RegExp('value: "' + window + '"'));
  }
  assert.match(referralPage, /summary\.dataAvailable \? summary\.handoffs\.total\.toLocaleString\(\) : "—"/);
  assert.match(referralPage, /Linked to search/);
  assert.match(referralPage, /Not linked to search/);
  assert.match(referralPage, /Data state/);
  assert.match(referralPage, /lg:grid-cols-4/);
  assert.match(referralPage, /lg:grid-cols-2/);
  assert.match(referralPage, /grid grid-cols-2 gap-x-4 gap-y-4/);
  assert.match(providersPage, /aria-labelledby="unlinked-handoffs"/);
  assert.match(providersPage, /href="\/admin\/redirects\?correlation=unavailable"/);
  assert.match(referralPage, /not confirmed bookings or payments/);
  assert.match(referralPage, /table className="w-full table-fixed text-\[13px\]"/);
  assert.doesNotMatch(referralPage, /AdminMetricCard|AdminFilterBar|AdminDataTable|AdminStatusBadge/);
});

test("Task 3: standalone handoffs preserve filters, records and next-cursor behavior", () => {
  assert.match(handoffsPage, /adminOperationalReads\.handoffs\.list\(params\)/);
  assert.match(handoffsPage, /if \(embedded\) return \(/);
  assert.match(handoffsPage, /<AdminDataTable/); // Original embedded Search Activity variant remains.
  assert.match(handoffsPage, /<ProviderHandoffFilters/);
  assert.match(handoffFilters, /aria-label="Filter provider handoffs"/);
  assert.match(handoffsPage, /aria-label="Provider handoff records"/);
  assert.match(handoffsPage, /min-w-\[1080px\] table-fixed/);
  for (const field of ["product", "identity", "correlation", "provider", "environment"]) {
    assert.match(handoffsPage, new RegExp('name="' + field + '"'));
  }
  for (const field of ["userId", "visitorId", "from", "to"]) {
    assert.match(handoffsPage, new RegExp('name="' + field + '"'));
  }
  for (const label of ["Created", "Product", "Provider", "Route", "Price", "Source", "Destination", "Identity", "Search link", "Action"]) {
    assert.ok(handoffsPage.includes('"' + label + '"'), "Missing handoff column " + label);
  }
  assert.match(handoffsPage, /handoff\.identity\.userId \|\| handoff\.identity\.visitorId/);
  assert.match(handoffsPage, /handoff\.searchCorrelation\.kind === "exact"/);
  assert.match(handoffsPage, /href=\{"\/admin\/redirects\/" \+ handoff\.id/);
  assert.match(handoffsPage, /cursorHref\("\/admin\/redirects", raw, result\.data\.nextCursor\)/);
  assert.match(handoffsPage, /result\.status === "invalid"/);
});

test("Task 3: handoff detail groups every field without tiles or losing verification meaning", () => {
  assert.match(handoffDetailPage, /adminOperationalReads\.handoffs\.detail\(id, query\)/);
  assert.match(handoffDetailPage, /notFound\(\)/);
  assert.match(handoffDetailPage, /Handoff overview/);
  assert.match(handoffDetailPage, /Referral information/);
  assert.match(handoffDetailPage, /Identity &amp; correlation/);
  assert.ok(handoffDetailPage.indexOf('aria-labelledby="handoff-identity"') < handoffDetailPage.indexOf('aria-labelledby="handoff-overview"'));
  assert.ok(handoffDetailPage.indexOf('aria-labelledby="handoff-overview"') < handoffDetailPage.indexOf('aria-labelledby="handoff-referral"'));
  assert.match(handoffDetailPage, /md:grid-cols-3/);
  assert.match(handoffDetailPage, /"HOTEL" \? "Property" : "Route"/);
  for (const label of ["Provider", "Product", "Created", "Price",
    "Source page", "Destination domain", "Environment", "Handoff ID",
    "Identity", "Search correlation", "Search history ID", "User ID", "Visitor ID"]) {
    assert.ok(handoffDetailPage.includes('label="' + label + '"'), "Missing detail field " + label);
  }
  assert.match(handoffDetailPage, /Outbound referral recorded; booking and payment are not confirmed/);
  assert.match(handoffDetailPage, /searchCorrelation\.kind === "exact"/);
  assert.doesNotMatch(handoffDetailPage, /AdminSectionCard|bg-slate-50|rounded-xl/);
  assert.match(adminShell, /providerReportingWorkspace/);
  assert.match(adminShell, /providersWorkspace \|\| providerReportingWorkspace/);
});

test("Tasks 4–6 place the small Referral date filter beside tabs only when selected", () => {
  assert.match(providersPage, /attribution \? \(/);
  assert.match(providersPage, /<nav aria-label="Provider reporting sections"/);
  assert.match(providersPage, /<ReferralWindowFilter days=\{attributionDays \?\? 30\} embedded \/>/);
  assert.doesNotMatch(providersPage, /attributionEnvironment === "production"/);
  assert.doesNotMatch(referralPage, /summary\.environment === "production"/);
  assert.match(referralPage, /\{!embedded \? \(/);
  assert.doesNotMatch(referralPage, /day window/);
  assert.doesNotMatch(referralWindowFilter, /Reporting window/);
  assert.match(referralWindowFilter, /<SearchMonitorSelect label="Date range" name="days"/);
  assert.match(referralWindowFilter, /appearance="plain" align="end"/);
  assert.match(referralWindowFilter, /router\.replace\(target, \{ scroll: false \}\)/);
  assert.match(referralWindowFilter, /name="view" value="attribution"/);
  assert.match(referralWindowFilter, /<noscript>/);
  assert.match(referralWindowFilter, /Last " \+ days \+ " days"/);
});

test("Tasks 7–8 use User Activity-style provider handoff filters without losing scoped IDs", () => {
  assert.match(handoffsPage, /<h1 className="sr-only">Provider Handoffs<\/h1>/);
  assert.doesNotMatch(handoffsPage, /Recorded outbound referrals only/);
  assert.match(handoffsPage, /<SearchWorkspaceBackLink href="\/admin\/providers\?view=attribution"/);
  assert.match(handoffsPage, /<ProviderHandoffFilters/);
  assert.match(handoffFilters, /aria-label="Search by provider"/);
  assert.match(handoffFilters, /<SearchMonitorSelect label="Product"/);
  assert.match(handoffFilters, /<SearchMonitorSelect label="Identity"/);
  assert.match(handoffFilters, /<SearchMonitorSelect label="Search link"/);
  assert.match(handoffFilters, /<SearchMonitorSelect label="Environment"/);
  assert.match(handoffFilters, /appearance="plain"/);
  assert.match(handoffFilters, /setTimeout\(\(\) => navigate\(next\), 300\)/);
  assert.match(handoffFilters, /router\.replace\(href, \{ scroll: false \}\)/);
  assert.match(handoffFilters, /onValueChange=\{value => update\(\{ identity: value \}, false, true\)\}/);
  assert.doesNotMatch(handoffFilters, /Apply filters/);
  assert.match(handoffsPage, /if \(embedded\) return \(/);
  assert.match(handoffsPage, /<AdminFilterBar action=\{embedded/);
});

test("Task 8 keeps filters and deep-linked date/identity scope correctly across changes", () => {
  const initial = {
    product: "HOTEL", identity: "guest", correlation: "unavailable",
    provider: "  KAYAK sandbox  ", environment: "staging",
  };
  const scope = {
    userId: "user_123", visitorId: "guest_123",
    from: "2026-10-01", to: "2026-11-03",
  };
  const normal = new URL(providerHandoffFiltersHref(initial, scope), "https://internal.example");
  assert.equal(normal.pathname, "/admin/redirects");
  for (const [key, value] of Object.entries({
    userId: "user_123", visitorId: "guest_123",
    from: "2026-10-01", to: "2026-11-03",
    product: "HOTEL", identity: "guest", correlation: "unavailable",
    provider: "KAYAK sandbox", environment: "staging",
  })) assert.equal(normal.searchParams.get(key), value);
  assert.equal(normal.searchParams.has("cursor"), false);
  const changedIdentity = new URL(providerHandoffFiltersHref({ ...initial, identity: "unattributed" },
    scope, true), "https://internal.example");
  assert.equal(changedIdentity.searchParams.has("userId"), false);
  assert.equal(changedIdentity.searchParams.has("visitorId"), false);
  assert.equal(changedIdentity.searchParams.get("from"), "2026-10-01");
  assert.equal(changedIdentity.searchParams.get("to"), "2026-11-03");
  assert.equal(changedIdentity.searchParams.get("product"), "HOTEL");
  assert.equal(changedIdentity.searchParams.get("identity"), "unattributed");
});

test("Handoff filter keeps newer local text during stale server refreshes", () => {
  const scope = { userId: "", visitorId: "", from: "", to: "" };
  const base = {
    product: "", identity: "all", correlation: "",
    provider: "KAYAK", environment: "",
  };
  const latest = providerHandoffFiltersHref({ ...base, provider: "KAYAK sandbox" }, scope);
  assert.equal(shouldAcceptHandoffFilterResponse(base, scope, latest, "KAYAK sandbox"), false);
  assert.equal(shouldAcceptHandoffFilterResponse(base, scope,
    providerHandoffFiltersHref(base, scope), "KAYAK sandbox"), false);
  assert.equal(shouldAcceptHandoffFilterResponse({ ...base, provider: "KAYAK sandbox" },
    scope, latest, "KAYAK sandbox"), true);
  assert.equal(shouldAcceptHandoffFilterResponse(base, scope, latest,
    "KAYAK sandbox", true), true); // Deliberate browser Back/Forward.
  assert.match(handoffFilters, /latestProviderDraft\.current = patch\.provider/);
  assert.match(handoffFilters, /shouldAcceptHandoffFilterResponse\(/);
  assert.match(handoffFilters, /if \(timeout\.current\) clearTimeout\(timeout\.current\)/);
});

test("Handoff identity unscoping stays active during subsequent rapid changes", () => {
  assert.match(handoffFilters, /const identityScopeCleared = useRef\(false\)/);
  assert.match(handoffFilters, /if \(changeIdentity\) identityScopeCleared\.current = true/);
  assert.match(handoffFilters, /providerHandoffFiltersHref\(next, scope, identityScopeCleared\.current\)/);
  const scope = { userId: "account_1", visitorId: "visitor_1",
    from: "2026-10-20", to: "2026-11-03" };
  const identityChanged = {
    product: "HOTEL", identity: "guest", correlation: "",
    provider: "", environment: "staging",
  };
  for (const product of ["FLIGHT", "HOTEL"]) {
    const target = new URL(providerHandoffFiltersHref({ ...identityChanged, product },
      scope, true), "https://internal.example");
    assert.equal(target.searchParams.has("userId"), false);
    assert.equal(target.searchParams.has("visitorId"), false);
    assert.equal(target.searchParams.get("identity"), "guest");
    assert.equal(target.searchParams.get("from"), scope.from);
    assert.equal(target.searchParams.get("to"), scope.to);
  }
});

test("No-script referral date selection submits exactly one days field", () => {
  const enhanced = referralWindowFilter.indexOf("<SearchMonitorSelect");
  const noScript = referralWindowFilter.indexOf("<noscript>");
  const fallback = referralWindowFilter.indexOf("<form action=", noScript);
  assert.ok(enhanced >= 0 && noScript > enhanced && fallback > noScript);
  assert.match(referralWindowFilter, /<select id="referral-window-fallback" name="days"/);
  assert.match(referralWindowFilter, /referral-window-enhanced \{ display: none !important; \}/);
  assert.match(referralWindowFilter, /<button type="submit"/);
});

test("Handoff browser history only bypasses the stale-response guard for real filter changes", () => {
  const original = {
    product: "HOTEL", identity: "guest", correlation: "unavailable",
    provider: "KAYAK", environment: "staging",
  };
  const scope = {
    userId: "", visitorId: "", from: "2026-10-01", to: "2026-11-03",
  };
  const currentHref = providerHandoffFiltersHref(original, scope);
  const cursorOnly = currentHref + "&cursor=next-record&limit=50";
  assert.equal(providerHandoffHistoryFilterHref(new URL(cursorOnly, "https://internal.example").search),
    currentHref);
  assert.notEqual(providerHandoffHistoryFilterHref("?product=FLIGHT&identity=guest"),
    currentHref);
  // A cursor-only change must not set the override used for external
  // filter navigation. Otherwise the next older search response wins.
  assert.match(handoffFilters, /providerHandoffHistoryFilterHref\(window\.location\.search\) === latestServerFilterHref\.current/);
  assert.match(handoffFilters, /externalNavigation\.current = false;\s+return;/);
  assert.match(handoffFilters, /latestServerFilterHref\.current = providerHandoffFiltersHref\(initial, scope\)/);
  assert.equal(shouldAcceptHandoffFilterResponse(original, scope,
    currentHref, "KAYAK sandbox", false), false);
});

test("Tasks 9–10 simplify only the handoff detail header and move back navigation left", () => {
  assert.match(handoffDetailPage, /<h1 className="sr-only">Provider handoff detail<\/h1>/);
  assert.match(handoffDetailPage, /<ArrowLeft size=\{16\}/);
  assert.match(handoffDetailPage, /<Link href=\{backHref\}/);
  assert.match(handoffDetailPage, /Back to handoffs/);
  assert.ok(handoffDetailPage.indexOf("Back to handoffs") < handoffDetailPage.indexOf("Handoff overview"));
  assert.doesNotMatch(handoffDetailPage, /justify-between gap-3 border-b/);
  assert.match(handoffDetailPage, /Referral information/);
  assert.match(handoffDetailPage, /Outbound referral recorded; booking and payment are not confirmed/);
  assert.match(handoffDetailPage, /<Field label="User ID"/);
  assert.match(handoffDetailPage, /<Field label="Visitor ID"/);
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
