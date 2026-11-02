import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
const service = readFileSync("src/services/adminFlightStatusOperationsService.ts", "utf8");
const statusService = readFileSync("src/services/flightStatusService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const contract = readFileSync("docs/partner-flight-status-contract.md", "utf8");

test("flight status admin is a read-only trusted snapshot operations page", () => {
  assert.match(page, /<AdminPageShell title="Flight Status Operations" hideHeader>/);
  assert.doesNotMatch(page, /description="Monitor trusted provider-supplied operational flight status/);
  assert.doesNotMatch(page, /Search results, handoffs and booking confirmations never infer live status/);
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
  assert.match(page, /Provider-matched flights awaiting their first status/);
  assert.match(page, /Matches status provider/);
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
  assert.match(page, /Within 15-min window/);
  assert.match(statusService, /age >= -maximumFutureEventSkewMs && age <= freshnessWindowMs/);
});

test("flight status operations does not invent an event history or segment model", () => {
  assert.match(page, /One latest primary-flight status per confirmed trip/);
  assert.match(page, /Return flights and connections are not tracked separately/);
  assert.match(page, /No segment history yet/);
  assert.match(contract, /one operational snapshot per `MyTrip`/);
  assert.doesNotMatch(service, /FlightStatusEvent/);
});


test("Flight Status keeps safety and environment guidance within readiness, not a standalone card", () => {
  assert.doesNotMatch(page, /<h2[^>]*>Operational boundaries<\/h2>/);
  const readinessStart = page.indexOf(">Status-feed readiness</h2>");
  const distributionStart = page.indexOf(">Latest status distribution</h2>", readinessStart);
  assert.ok(readinessStart >= 0 && distributionStart > readinessStart);
  const readinessCopy = page.slice(readinessStart, distributionStart);
  assert.match(readinessCopy, /Only the configured provider can send signed updates/);
  assert.match(readinessCopy, /A configured feed does not mean updates are arriving/);
  assert.match(readinessCopy, /Live status requires a valid signed update from the configured provider for a confirmed flight/);
  assert.match(readinessCopy, /Searches, handoffs and confirmations do not prove live status/);
  assert.match(readinessCopy, /Status records have no environment label/);
  assert.match(readinessCopy, /connected \{operations\?\.environment \?\? "application"\} database/);
  assert.equal((page.match(/<AdminSectionCard className="min-w-0 p-3 shadow-none sm:p-4">/g) || []).length, 5);
  assert.match(page, /<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">/);
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});

test("flight status operations preserves the metasearch boundary", () => {
  assert.match(page, /Searches, handoffs and confirmations do not prove live status/);
  assert.match(navigation, /href: "\/admin\/flight-status"/);
  assert.doesNotMatch(navigation, /\/admin\/bookings/);
});

test("flight status declares database-scoped environment limits", () => {
  assert.match(page, /Status records have no environment label/);
  assert.match(page, /uses the connected/);
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
    "Awaiting first status snapshot",
    "Latest trusted flight-status snapshots",
  ];
  for (const section of originalSections) {
    assert.ok(page.includes(section), "Section must remain visible: " + section);
  }
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);

  const distributionStart = page.indexOf('<div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-2">');
  const awaitingStart = page.indexOf('operations.awaitingFirstSnapshot.length ? (', distributionStart);
  assert.ok(distributionStart >= 0 && awaitingStart > distributionStart);
  const summaryPanels = page.slice(distributionStart, awaitingStart);
  assert.match(summaryPanels, /Latest status distribution/);
  assert.match(summaryPanels, /Snapshot scope/);
  assert.match(summaryPanels, /!operations \? \(/);
  assert.match(summaryPanels, /Flight-status distribution is unavailable/);
  assert.match(summaryPanels, /No counts are assumed/);
  assert.match(summaryPanels, /operations\.statusDistribution\.length/);
  assert.doesNotMatch(page, /\{operations \? \(\s*<div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-2">/);
});

test("latest snapshots and awaiting-first-snapshot sections never disappear at zero or on failure", () => {
  assert.match(page, /operations\.awaitingFirstSnapshot\.length/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /No flights awaiting a first snapshot/);
  assert.match(page, /Count awaiting first status is unknown/);
  assert.match(page, /operations\.recentSnapshots\.length/);
  assert.match(page, /operations\.recentSnapshots\.map/);
  assert.match(page, /<h2[^>]*>Latest trusted flight-status snapshots<\/h2>/);
  assert.match(page, /No verified flight-status snapshots recorded yet/);
  assert.match(page, /Recent flight-status data unavailable/);
  assert.match(page, /<h2[^>]*>Awaiting first status snapshot<\/h2>/);
  assert.match(page, /No status feed is configured/);
  assert.match(page, /No zero values were invented/);
  assert.doesNotMatch(page, /operations\.recentSnapshots\.length \? \([\s\S]*?\) : null\s*\) : null/);
});

test("Flight Status overview follows the planned responsive page hierarchy", () => {
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.match(page, /grid min-w-0 items-stretch gap-3 lg:grid-cols-2/);
  const order = ["Flight status overview", "Status-feed readiness", "Latest status distribution",
    "Snapshot scope", "Awaiting first status snapshot", "Latest trusted flight-status snapshots"];
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



test("Flight Status overview has an understated container and compact metrics without shared card shadows", () => {
  const sectionStart = page.indexOf('<section aria-labelledby="flight-status-overview-title"');
  const sectionEnd = page.indexOf("</section>", sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, "The overview section must be visible");
  const overview = page.slice(sectionStart, sectionEnd);
  assert.match(overview, /rounded-xl border border-slate-200\/90 p-3 sm:p-4/);
  assert.match(overview, /mb-2\.5 text-base font-semibold leading-6 tracking-tight/);
  assert.match(overview, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.equal((overview.match(/<FlightStatusMetric label=/g) || []).length, 6);
  assert.doesNotMatch(overview, /<AdminMetricCard/);

  const tileStart = page.indexOf("function FlightStatusMetric(");
  const tileEnd = page.indexOf("function Fact(", tileStart);
  assert.ok(tileStart >= 0 && tileEnd > tileStart);
  const tile = page.slice(tileStart, tileEnd);
  assert.match(tile, /rounded-lg border border-slate-200\/80 bg-white px-3 py-2\.5/);
  assert.match(tile, /text-xs font-medium leading-4 text-slate-600/);
  assert.match(tile, /text-\[22px\] font-semibold leading-\[26px\] tracking-tight tabular-nums/);
  assert.match(tile, /value\.toLocaleString\("en-US"\)/);
  assert.doesNotMatch(tile, /\bshadow-(?:sm|md|lg|xl|2xl)\b|\bfont-black\b/);

  for (const field of ["confirmedFlights", "feedEligibleFlights", "trackedFlights", "missingSnapshots", "currentSnapshots", "staleSnapshots"]) {
    assert.ok(overview.includes("operations.metrics." + field), "Use trusted metric " + field);
  }
  assert.match(overview, /role="status"/);
  assert.match(overview, /No zero values were invented/);
  assert.match(page, /<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">/);
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);
});


test("all six Flight Status metrics form one accessible horizontal row without page overflow", () => {
  const start = page.indexOf('<section aria-labelledby="flight-status-overview-title"');
  const end = page.indexOf("</section>", start);
  assert.ok(start >= 0 && end > start);
  const overview = page.slice(start, end);
  assert.match(overview, /role="region" aria-label="Flight status metrics" tabIndex=\{0\}/);
  assert.match(overview, /min-w-0 max-w-full overflow-x-auto overscroll-x-contain/);
  assert.match(overview, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.doesNotMatch(overview, /(?:sm|md|lg|xl|2xl):grid-cols-(?:1|2|3|4|5|6)/);
  assert.equal((overview.match(/<FlightStatusMetric label=/g) || []).length, 6);
  assert.match(page, /flex h-full min-w-0 flex-col rounded-lg/);
  assert.match(page, /min-w-0 break-words text-xs font-normal leading-4/);
  assert.match(page, /value\.toLocaleString\("en-US"\)/);
  for (const key of ["confirmedFlights", "feedEligibleFlights", "trackedFlights", "missingSnapshots", "currentSnapshots", "staleSnapshots"]) {
    assert.ok(overview.includes("operations.metrics." + key), "Original trustworthy metric missing: " + key);
  }
  const hints = Array.from(overview.matchAll(/<FlightStatusMetric label="([^"]+)"[^>]*?hint="([^"]+)"/g));
  assert.equal(hints.length, 6);
  for (const [, label, hint] of hints) {
    assert.ok(hint.length <= 30, label + " hint should fit a compact card");
  }
});

test("short descriptions preserve source and data-availability boundaries", () => {
  for (const sentence of [
    "Only the configured provider can send signed updates.",
    "Duffel search and KAYAK sandbox do not supply this feed.",
    "Each signed update must name the configured provider.",
    "A configured feed does not mean updates are arriving.",
    "Latest stored statuses from the configured provider.",
    "One latest primary-flight status per confirmed trip.",
    "Return flights and connections are not tracked separately.",
    "Live status requires a valid signed update from the configured provider for a confirmed flight.",
    "Searches, handoffs and confirmations do not prove live status.",
    "Status records have no environment label.",
  ]) {
    assert.ok(page.includes(sentence), "Key boundary missing: " + sentence);
  }
  assert.match(page, /No zero values were invented/);
  assert.match(page, /No counts are assumed/);
  assert.match(page, /Count awaiting first status is unknown/);
  assert.match(page, /No verified flight-status snapshots recorded yet/);
  assert.match(page, /Recent flight-status data unavailable/);
  assert.match(page, /No status feed is configured; no snapshots to show/);
  assert.match(page, /<AdminPageShell title="Flight Status Operations" hideHeader>/);
  assert.match(page, /href="\/admin\/confirmed-trips"/);
  assert.doesNotMatch(page, /href="\/admin\/flights"|href="\/admin\/searches\/activity/);
  assert.match(page, /operations\.statusDistribution\.map/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});


test("Snapshot Scope is compact, readable and aligned with the distribution section", () => {
  const start = page.indexOf('<div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-2">');
  const end = page.indexOf('>Awaiting first status snapshot</h2>', start);
  assert.ok(start >= 0 && end > start);
  const paired = page.slice(start, end);
  assert.equal((paired.match(/<AdminSectionCard className="min-w-0 p-3 shadow-none sm:p-4">/g) || []).length, 2);
  const scope = paired.slice(paired.indexOf(">Snapshot scope</h2>"));
  assert.match(scope, /mt-1 text-\[13px\] leading-5 text-slate-600/);
  assert.match(scope, /mt-2 flex min-w-0 flex-wrap gap-1\.5/);
  assert.match(scope, /One latest primary-flight status per confirmed trip/);
  assert.match(scope, /Return flights and connections are not tracked separately/);
  assert.match(scope, /Provider supplied only/);
  assert.match(scope, /Latest snapshot only/);
  assert.match(scope, /No segment history yet/);
  assert.doesNotMatch(scope, /\bmt-4\b|\bfont-black\b|\bshadow-md\b/);
});

test("Flight Status uses consistent compact sections, balanced readiness facts and honest empty states", () => {
  assert.equal((page.match(/<AdminSectionCard className="min-w-0 p-3 shadow-none sm:p-4">/g) || []).length, 5);
  assert.match(page, /grid min-w-0 items-stretch gap-3 lg:grid-cols-2/);
  assert.match(page, /grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(page, /mt-2 grid min-w-0 gap-2 sm:grid-cols-2/);
  assert.match(page, /shrink-0 whitespace-nowrap/);
  assert.equal((page.match(/<Fact label=/g) || []).length, 5);
  assert.equal((page.match(/<AdminDataTable/g) || []).length, 2);
  assert.equal((page.match(/<p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2\.5/g) || []).length, 6);
  assert.doesNotMatch(page, /<AdminEmptyState/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
  assert.match(page, /Count awaiting first status is unknown/);
  assert.match(page, /Recent flight-status data unavailable\. No records are assumed/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /getFlightStatusOperationsSnapshot\(undefined, readiness\)/);
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);
});

test("Flight Status uses a compact, right-aligned Confirmed trips toolbar and keeps Flight Search in Search Activity", () => {
  const match = page.match(/<div role="group" aria-label="Flight Status actions" className="([^"]+)">([\s\S]*?)<\/div>/);
  assert.ok(match, "Flight Status action toolbar must be visible");
  const [, classes, actions] = match;
  assert.match(classes, /mb-3/);
  assert.match(classes, /justify-end/);
  assert.match(classes, /flex-wrap/);
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



test("Flight Status hides only the page introduction and preserves an accessible title", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(shell, /hideHeader\s*\?\s*<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(shell, /hideHeader \? "" : "mt-6"/);
  assert.match(page, /<AdminPageShell title="Flight Status Operations" hideHeader>/);
  assert.doesNotMatch(page, /eyebrow=|description=|actions=\{/);
  assert.doesNotMatch(page, /Admin operations|Monitor trusted provider-supplied operational flight status/);
  const toolbarIndex = page.indexOf('role="group" aria-label="Flight Status actions"');
  const parentIndex = page.indexOf('<AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">');
  assert.ok(toolbarIndex > 0 && parentIndex > toolbarIndex, "The toolbar must sit above the original parent card");
  assert.equal((page.match(/href="\/admin\/confirmed-trips"/g) || []).length, 1);
  for (const section of ["Flight status overview", "Status-feed readiness", "Latest status distribution",
    "Snapshot scope", "Awaiting first status snapshot", "Latest trusted flight-status snapshots"]) {
    assert.ok(page.includes(section), "Preserve operational section: " + section);
  }
  assert.match(page, /getFlightStatusOperationsSnapshot\(undefined, readiness\)/);
  assert.match(page, /No zero values were invented/);
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
    "Snapshot scope", "Awaiting first status snapshot", "Latest trusted flight-status snapshots"];
  const positions = order.map(label => page.indexOf(">" + label + "</h2>", parentStart));
  assert.ok(positions.every(n => n > parentStart && n < parentEnd), "All existing sections must stay within the parent card");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "Keep the existing section order");
  assert.match(page.slice(0, parentStart), /href="\/admin\/confirmed-trips"/);
  assert.doesNotMatch(page.slice(0, parentStart), /href="\/admin\/searches\/activity\?product=FLIGHT"/);
  assert.equal((page.match(/<FlightStatusMetric label=/g) || []).length, 6);
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});
