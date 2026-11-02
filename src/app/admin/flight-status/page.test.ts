import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
const service = readFileSync("src/services/adminFlightStatusOperationsService.ts", "utf8");
const statusService = readFileSync("src/services/flightStatusService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const contract = readFileSync("docs/partner-flight-status-contract.md", "utf8");

test("flight status admin is a read-only trusted snapshot operations page", () => {
  assert.match(page, /title="Flight Status Operations"/);
  assert.match(page, /trusted provider-supplied operational flight status/);
  assert.match(page, /Search results, handoffs and booking confirmations never infer live status/);
  assert.match(page, /Latest trusted flight-status snapshots/);
  assert.match(page, /This is not an event history/);
  assert.doesNotMatch(page, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("flight status operations only treats signed provider-confirmed flights as eligible", () => {
  assert.match(service, /tripType: "FLIGHT"/);
  assert.match(service, /source: "PARTNER_CONFIRMATION"/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(statusService, /trip\.source !== "PARTNER_CONFIRMATION"/);
  assert.match(statusService, /!trip\.partnerConfirmationOccurredAt/);
});

test("missing status is scoped to the configured provider rather than all confirmed flights", () => {
  assert.match(service, /providerName: readiness\.providerName/);
  assert.match(service, /feedEligibleFlights/);
  assert.match(service, /monitoringTrackedFlights/);
  assert.match(service, /monitoringStaleSnapshots/);
  assert.match(service, /flightStatusSnapshot: \{ is: null \}/);
  assert.match(page, /Provider-matched confirmed flights that have not received a trusted status snapshot yet/);
  assert.match(page, /Confirmed flights matching the configured provider name/);
});

test("flight status readiness is provider-bound and independent from database telemetry", () => {
  assert.match(service, /FLIGHT_STATUS_PROVIDER_NAME/);
  assert.match(service, /FLIGHT_STATUS_WEBHOOK_SECRET/);
  assert.match(service, /credentialModel: "single_provider_bound_secret"/);
  assert.match(page, /readiness\.feedReady/);
  assert.match(page, /readiness\.providerName \|\| "None"/);
  assert.match(page, /readiness\.webhookCredentialConfigured \? "Configured" : "Not configured"/);
  assert.match(page, /Single provider \+ dedicated secret/);
});

test("flight status operations shares the canonical freshness rule", () => {
  assert.match(service, /flightStatusFreshness/);
  assert.match(service, /flightStatusLimits\.freshnessWindowMs/);
  assert.match(page, /Snapshots observed from now back through 15 minutes/);
  assert.match(statusService, /age >= -maximumFutureEventSkewMs && age <= freshnessWindowMs/);
});

test("flight status operations does not invent an event history or segment model", () => {
  assert.match(page, /one latest primary-flight snapshot per confirmed My Trip/);
  assert.match(page, /Return legs and connecting segments are not tracked independently yet/);
  assert.match(page, /No segment history yet/);
  assert.match(contract, /one operational snapshot per `MyTrip`/);
  assert.doesNotMatch(service, /FlightStatusEvent/);
});

test("flight status operations preserves the metasearch boundary", () => {
  assert.match(page, /never derives live flight status from a search, a provider handoff, or a trip confirmation/);
  assert.match(navigation, /href: "\/admin\/flight-status"/);
  assert.doesNotMatch(navigation, /\/admin\/bookings/);
});

test("flight status declares database-scoped environment limits", () => {
  assert.match(page, /FlightStatusSnapshot rows do not carry an environment column/);
  assert.match(page, /reports the database connected to the current/);
  assert.doesNotMatch(service, /query: \{ path: \["environment"\]/);
});

test("flight status telemetry unavailable state never invents zero metrics", () => {
  assert.match(page, /Flight-status telemetry unavailable/);
  assert.match(page, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});

test("all Flight Status sections are present regardless of telemetry availability", () => {
  const originalSections = [
    "Status-feed readiness",
    "Latest status distribution",
    "Snapshot scope",
    "Operational boundaries",
    "Awaiting first status snapshot",
    "Latest trusted flight-status snapshots",
  ];
  for (const section of originalSections) {
    assert.ok(page.includes(section), "Section must remain visible: " + section);
  }
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);

  const distributionStart = page.indexOf('<div className="grid items-start gap-3 lg:grid-cols-2">');
  const boundaryStart = page.indexOf('>Operational boundaries</h2>');
  assert.ok(distributionStart >= 0 && boundaryStart > distributionStart);
  const summaryPanels = page.slice(distributionStart, boundaryStart);
  assert.match(summaryPanels, /Latest status distribution/);
  assert.match(summaryPanels, /Snapshot scope/);
  assert.match(summaryPanels, /!operations \? \(/);
  assert.match(summaryPanels, /Flight-status distribution is unavailable/);
  assert.match(summaryPanels, /No counts are assumed/);
  assert.match(summaryPanels, /operations\.statusDistribution\.length/);
  assert.doesNotMatch(page, /\{operations \? \(\s*<div className="grid items-start gap-3 lg:grid-cols-2">/);
});

test("latest snapshots and awaiting-first-snapshot sections never disappear at zero or on failure", () => {
  assert.match(page, /operations\.awaitingFirstSnapshot\.length/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /No flights awaiting a first snapshot/);
  assert.match(page, /The number of flights awaiting a snapshot is unknown/);
  assert.match(page, /operations\.recentSnapshots\.length/);
  assert.match(page, /operations\.recentSnapshots\.map/);
  assert.match(page, /<AdminEmptyState[\s\S]*?title="Latest trusted flight-status snapshots"/);
  assert.match(page, /No trusted flight-status snapshots have been recorded/);
  assert.match(page, /Recent snapshots could not be loaded/);
  assert.match(page, /<AdminEmptyState title="Awaiting first status snapshot"/);
  assert.match(page, /No status provider feed is configured/);
  assert.match(page, /No zero values were invented/);
  assert.doesNotMatch(page, /operations\.recentSnapshots\.length \? \([\s\S]*?\) : null\s*\) : null/);
});

test("Flight Status overview follows the planned responsive page hierarchy", () => {
  assert.match(page, /sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6/);
  assert.match(page, /grid items-start gap-3 lg:grid-cols-2/);
  const order = ["Flight status overview", "Status-feed readiness", "Latest status distribution",
    "Snapshot scope", "Awaiting first status snapshot", "Latest trusted flight-status snapshots",
    "Operational boundaries"];
  const locations = order.map(label => page.indexOf(">" + label + "</h2>"));
  assert.ok(locations.every(n => n >= 0), "All operational headings must stay visible");
  assert.deepEqual(locations, [...locations].sort((a, b) => a - b));
  for (const field of ["confirmedFlights", "feedEligibleFlights", "trackedFlights", "missingSnapshots", "currentSnapshots", "staleSnapshots"]) {
    assert.ok(page.includes("operations.metrics." + field), "Metric data must be preserved: " + field);
  }
  assert.equal((page.match(/<Fact label=/g) || []).length, 5);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /operations\.recentSnapshots\.map/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
});


test("Flight Status header keeps only Confirmed trips while flight search stays in Search Activity", () => {
  const actions = page.match(/actions=\{([\s\S]*?)\n      \}\n    >/ )?.[1];
  assert.ok(actions, "Flight Status header actions must be present");
  assert.match(actions, /<Link href="\/admin\/confirmed-trips"[^>]*>\s*Confirmed trips\s*<\/Link>/);
  assert.equal((actions.match(/<Link /g) || []).length, 1, "Keep only the relevant Confirmed trips shortcut");
  assert.doesNotMatch(actions, /href="\/admin\/flights"|href="\/admin\/searches\/activity|Flight search operations/);

  // Flight search monitoring is still available from the canonical admin navigation.
  const searchActivity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
  assert.match(searchActivity, /{ label: "Flights", value: "FLIGHT" }/);
  assert.match(searchActivity, /one\(raw\.product\) === item\.value/);
  assert.match(navigation, /href: "\/admin\/searches\/activity", label: "Search Activity"/);
  assert.match(navigation, /href: "\/admin\/flights", parentHref: "\/admin\/providers"/);
});


test("Flight Status uses the same single white parent column as Admin Overview", () => {
  const overviewPage = readFileSync("src/app/admin/page.tsx", "utf8");
  assert.match(overviewPage, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  const parentOpening = '<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">';
  const parentStart = page.indexOf(parentOpening);
  const parentEnd = page.lastIndexOf("</AdminSectionCard>");
  const shellEnd = page.indexOf("</AdminPageShell>", parentEnd);

  assert.ok(parentStart >= 0 && parentEnd > parentStart && shellEnd > parentEnd,
    "One parent card must wrap the Flight Status operational content inside AdminPageShell");
  assert.equal((page.match(/<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">/g) || []).length, 1,
    "A single parent card should be used, not an extra stack of nested parent containers");
  assert.match(page, />\s*<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">\s*<section aria-labelledby="flight-status-overview-title"/);
  assert.doesNotMatch(page.slice(parentStart, parentEnd), /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);
  const order = ["Flight status overview", "Status-feed readiness", "Latest status distribution",
    "Snapshot scope", "Awaiting first status snapshot", "Latest trusted flight-status snapshots",
    "Operational boundaries"];
  const positions = order.map(label => page.indexOf(">" + label + "</h2>", parentStart));
  assert.ok(positions.every(n => n > parentStart && n < parentEnd), "All existing sections must stay within the parent card");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "Keep the existing section order");
  assert.match(page.slice(0, parentStart), /href="\/admin\/confirmed-trips"/);
  assert.doesNotMatch(page.slice(0, parentStart), /href="\/admin\/searches\/activity\?product=FLIGHT"/);
  assert.equal((page.match(/<AdminMetricCard label=/g) || []).length, 6);
  assert.match(page, /grid gap-2\.5 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});
