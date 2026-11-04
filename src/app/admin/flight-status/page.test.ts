import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/components/admin/TripFlightStatusMonitoringPanel.tsx", "utf8");
const monitoring = readFileSync("src/app/admin/confirmed-trips/monitoring/page.tsx", "utf8");
const route = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
const service = readFileSync("src/services/adminFlightStatusOperationsService.ts", "utf8");
const statusService = readFileSync("src/services/flightStatusService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const contract = readFileSync("docs/partner-flight-status-contract.md", "utf8");

test("flight status admin is a read-only trusted snapshot operations page", () => {
  assert.match(monitoring, /<AdminPageShell title="Trip monitoring" hideHeader>/);
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
  assert.match(page, /We save only the latest provider-supplied status for the main flight in each confirmed trip/);
  assert.match(page, /Return and connecting flights aren't tracked separately/);
  assert.match(page, /No segment history yet/);
  assert.match(contract, /one operational snapshot per `MyTrip`/);
  assert.doesNotMatch(service, /FlightStatusEvent/);
});


test("Flight Status keeps one concise provider safety note within readiness, not a standalone card", () => {
  assert.doesNotMatch(page, /<h2[^>]*>Operational boundaries<\/h2>/);
  const readinessStart = page.indexOf(">Status-feed readiness</h2>");
  const distributionStart = page.indexOf(">Latest status distribution</h2>", readinessStart);
  assert.ok(readinessStart >= 0 && distributionStart > readinessStart);
  const readinessCopy = page.slice(readinessStart, distributionStart);
  assert.match(readinessCopy, /Only the configured provider can send signed updates/);
  assert.match(readinessCopy, /A configured feed does not mean updates are arriving/);
  assert.match(readinessCopy, /Live status requires signed provider updates for confirmed flights/);
  assert.match(readinessCopy, /not searches, handoffs or trip confirmations/);
  const note = readinessCopy.match(/<p className="mt-3 text-\[13px\] leading-5 text-slate-600">([\s\S]*?)<\/p>/);
  assert.ok(note, "Keep exactly one concise readiness note below the five configuration fields");
  assert.ok(note[1].trim().length < 185, "Readiness note should remain short");
  assert.doesNotMatch(readinessCopy, /<div className="mt-3 space-y-1\.5">|Each signed update must name the configured provider/);
  assert.doesNotMatch(readinessCopy, /Status records have no environment label|uses the connected/);
  assert.equal((page.match(/<AdminSectionCard className="min-w-0 p-3 shadow-none sm:p-4">/g) || []).length, 5);
  assert.match(page, /<div className="min-w-0 space-y-4">/);
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});

test("flight status operations preserves the metasearch boundary", () => {
  assert.match(page, /not searches, handoffs or trip confirmations/);
  assert.match(contract, /does not infer operational flight status from a search, a provider handoff, or a booking confirmation/);
  assert.match(navigation, /href: "\/admin\/confirmed-trips\/monitoring"/);
  assert.doesNotMatch(navigation, /\/admin\/bookings/);
});

test("flight status declares database-scoped environment limits", () => {
  assert.doesNotMatch(page, /Status records have no environment label|uses the connected/);
  assert.doesNotMatch(service, /query: \{ path: \["environment"\]/);
});

test("flight status telemetry unavailable state never invents zero metrics", () => {
  assert.match(page, /Flight-status telemetry unavailable/);
  assert.match(page, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});

test("all Flight Status monitoring sections remain visible without duplicate scope cards", () => {
  for (const section of [
    "Status-feed readiness",
    "Latest status distribution",
    "Awaiting first status snapshot",
    "Latest trusted flight-status snapshots",
  ]) {
    assert.ok(page.includes(section), "Section must remain visible: " + section);
  }
  assert.doesNotMatch(page, />Snapshot scope<\/h2>/);
  assert.doesNotMatch(page, />Flight status overview<\/h2>/);
  assert.match(page, /id="flight-status-overview-title" aria-label="Flight status overview"/);
  assert.match(page, /We save only the latest provider-supplied status for the main flight in each confirmed trip/);
  assert.match(page, /Provider supplied only/);
  assert.match(page, /Latest snapshot only/);
  assert.match(page, /No segment history yet/);
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.statusDistribution\.length/);
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

test("Flight Status follows the deduplicated monitoring hierarchy", () => {
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  const order = ["Status-feed readiness", "Latest status distribution", "Awaiting first status snapshot", "Latest trusted flight-status snapshots"];
  const locations = order.map(label => page.indexOf(">" + label + "</h2>"));
  assert.ok(locations.every(n => n >= 0), "All operational headings must stay visible");
  assert.deepEqual(locations, [...locations].sort((a, b) => a - b));
  assert.doesNotMatch(page, />Flight status overview<\/h2>|>Snapshot scope<\/h2>/);
  for (const field of ["confirmedFlights", "feedEligibleFlights", "trackedFlights", "missingSnapshots", "currentSnapshots", "staleSnapshots"]) {
    assert.ok(page.includes("operations.metrics." + field), "Metric data must be preserved: " + field);
  }
  assert.equal((page.match(/<Fact label=/g) || []).length, 5);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /operations\.recentSnapshots\.map/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
});



test("Flight Status overview has no extra outline or double padding and keeps compact metrics", () => {
  const sectionStart = page.indexOf('<section id="flight-status-overview-title" aria-label="Flight status overview"');
  const sectionEnd = page.indexOf("</section>", sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, "The overview section must be visible");
  const overview = page.slice(sectionStart, sectionEnd);
  assert.match(overview, /^<section id="flight-status-overview-title" aria-label="Flight status overview" className="min-w-0">/);
  assert.doesNotMatch(overview.slice(0, overview.indexOf(">") + 1), /(?:^|\s)(?:p-[0-9]|sm:p-[0-9]|pt-[0-9]|sm:pt-[0-9])/,
    "Do not add padding inside the already padded parent card");
  const overviewOpeningTag = overview.slice(0, overview.indexOf(">") + 1);
  assert.doesNotMatch(overviewOpeningTag, /\b(?:border|rounded|shadow)(?:-[^\s"]+)?\b/,
    "Overview section must not add a redundant decorative outline");
  assert.doesNotMatch(overview, />Flight status overview<\/h2>/);
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
  assert.match(page, /<div className="min-w-0 space-y-3">/);
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
    "A configured feed does not mean updates are arriving.",
    "Live status requires signed provider updates for confirmed flights",
    "not searches, handoffs or trip confirmations.",
    "Latest stored statuses from the configured provider.",
    "We save only the latest provider-supplied status for the main flight in each confirmed trip.",
    "Return and connecting flights aren't tracked separately.",
  ]) {
    assert.ok(page.includes(sentence), "Key boundary missing: " + sentence);
  }
  assert.match(page, /No zero values were invented/);
  assert.match(page, /No counts are assumed/);
  assert.match(page, /Count awaiting first status is unknown/);
  assert.match(page, /No verified flight-status snapshots recorded yet/);
  assert.match(page, /Recent flight-status data unavailable/);
  assert.match(page, /No status feed is configured; no snapshots to show/);
  assert.match(monitoring, /<AdminPageShell title="Trip monitoring" hideHeader>/);
  assert.match(monitoring, /href="\/admin\/confirmed-trips"/);
  assert.doesNotMatch(page, /href="\/admin\/flights"|href="\/admin\/searches\/activity/);
  assert.match(page, /operations\.statusDistribution\.map/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});


test("Snapshot scope is folded into status-feed readiness", () => {
  const readinessStart = page.indexOf(">Status-feed readiness</h2>");
  const distributionStart = page.indexOf(">Latest status distribution</h2>", readinessStart);
  assert.ok(readinessStart >= 0 && distributionStart > readinessStart);
  const readiness = page.slice(readinessStart, distributionStart);
  assert.match(readiness, /We save only the latest provider-supplied status for the main flight in each confirmed trip/);
  assert.match(readiness, /Return and connecting flights aren't tracked separately/);
  assert.match(readiness, /Provider supplied only/);
  assert.match(readiness, /Latest snapshot only/);
  assert.match(readiness, /No segment history yet/);
  assert.doesNotMatch(page, />Snapshot scope<\/h2>/);
});
test("Flight Status uses consistent compact sections, balanced readiness facts and honest empty states", () => {
  assert.doesNotMatch(page, />Snapshot scope<\/h2>/);
  assert.match(page, /grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(page, /mt-2 grid min-w-0 gap-2 sm:grid-cols-2/);
  assert.match(page, /shrink-0 whitespace-nowrap/);
  assert.equal((page.match(/<Fact label=/g) || []).length, 5);
  assert.equal((page.match(/<AdminDataTable/g) || []).length, 2);
  assert.ok((page.match(/<p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2\.5/g) || []).length >= 5);
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

test("legacy Flight Status links redirect securely to the expanded monitoring panel", () => {
  assert.match(route, /await requireAdminSession\("\/admin\/flight-status"\)/);
  assert.match(route, /redirect\("\/admin\/confirmed-trips\/monitoring\?panel=flight#flight-status-overview-title"\)/);
  assert.doesNotMatch(route, /<AdminPageShell|<AdminSectionCard|<FlightStatusMetric/);
  assert.match(monitoring, /<AdminPageShell title="Trip monitoring" hideHeader>/);
  assert.match(monitoring, /<TripWorkspaceNavigation active="monitoring" \/>/);
  assert.doesNotMatch(monitoring, /Back to Trips|Trip monitoring navigation/);
  assert.match(monitoring, /<TripFlightStatusMonitoringPanel \/>/);
  assert.match(monitoring, /id="trip-flight-status-panel"/);
  const searchActivity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
  assert.match(searchActivity, /{ label: "Flights", value: "FLIGHT" }/);
  assert.match(searchActivity, /one\(raw\.product\) === item\.value/);
  assert.match(navigation, /href: "\/admin\/searches\/activity", label: "Search Activity"/);
  assert.match(navigation, /href: "\/admin\/flights", parentHref: "\/admin\/providers"/);
});

test("unified Trip monitoring owns a single parent while preserving original flight-status sections", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(shell, /hideHeader\s*\?\s*<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(monitoring, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.equal((monitoring.match(/<AdminSectionCard /g) || []).length, 1);
  assert.match(monitoring, /<TripConfirmationsMonitoringPanel \/>/);
  assert.match(monitoring, /<TripFlightStatusMonitoringPanel \/>/);
  assert.match(page, /<div className="min-w-0 space-y-3">/);
  const sections = ["Status-feed readiness", "Latest status distribution", "Awaiting first status snapshot", "Latest trusted flight-status snapshots"];
  const positions = sections.map(label => page.indexOf(">" + label + "</h2>"));
  assert.ok(positions.every(n => n >= 0), "All monitoring sections must remain");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.doesNotMatch(page, />Flight status overview<\/h2>|>Snapshot scope<\/h2>/);
  assert.equal((page.match(/<FlightStatusMetric label=/g) || []).length, 6);
  assert.match(page, /grid w-full min-w-\[960px\] grid-cols-6 gap-2/);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /Flight-status distribution is unavailable\. No counts are assumed/);
  assert.match(page, /operations\.awaitingFirstSnapshot\.map/);
  assert.match(page, /operations\.recentSnapshots\.map/);
});
