import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const loading = readFileSync("src/app/admin/confirmed-trips/loading.tsx", "utf8");
const operationsPage = readFileSync("src/components/admin/TripConfirmationsMonitoringPanel.tsx", "utf8");
const monitoringPage = readFileSync("src/app/admin/confirmed-trips/monitoring/page.tsx", "utf8");
const operationsRedirect = readFileSync("src/app/admin/confirmed-trips/operations/page.tsx", "utf8");
const flightStatusRedirect = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
const directory = readFileSync("src/app/admin/confirmed-trips/records/page.tsx", "utf8");
const recordsView = readFileSync("src/components/admin/TripDirectoryView.tsx", "utf8");
const controls = readFileSync("src/components/admin/TripFilterControls.tsx", "utf8");
const dropdown = readFileSync("src/components/admin/SearchMonitorSelect.tsx", "utf8");
const workspace = readFileSync("src/lib/adminTripWorkspace.ts", "utf8");
const recordsTable = readFileSync("src/components/admin/ConfirmedTripRecordsTable.tsx", "utf8");
const breakdowns = readFileSync("src/components/admin/ConfirmedTripsBreakdowns.tsx", "utf8");
const service = readFileSync("src/services/adminConfirmedTripsOperationsService.ts", "utf8");
const recordsService = readFileSync("src/services/adminConfirmedTripsDirectoryService.ts", "utf8");
const filterSource = readFileSync("src/lib/adminConfirmedTripsDirectory.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const architecture = readFileSync("src/lib/my-trips-architecture.test.ts", "utf8");
const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");

test("Trips preserves its existing admin workspace without a visible page introduction", () => {
  assert.match(page, /<AdminPageShell title="Trips" hideHeader>/);
  assert.doesNotMatch(page, /View verified provider-confirmed trips across flights, hotels, and cars/);
  assert.doesNotMatch(page, /tracking-tight text-slate-950">Trips<\/p>/);
  assert.match(page, /<AdminPageShell title="Trips" hideHeader>/);
  assert.match(page, /role="group" aria-label="Trip shortcuts"/);
  assert.match(navigation, /href: "\/admin\/confirmed-trips", label: "Trips"/);
  assert.doesNotMatch(page, /href="\/admin\/confirmed-trips\/records"|Browse confirmed trips|Open full directory/);
  assert.match(page, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.match(page, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.match(shell, /border-slate-200 bg-white shadow-sm/);
  assert.doesNotMatch(page, /Admin operations|Jump to:/);
  assert.doesNotMatch(page, /Kurioticket handles refunds|Cancel booking|Issue ticket/);
});

test("Trip directory is the primary record workspace without duplicate entry links", () => {
  assert.doesNotMatch(page, /Browse confirmed trips|Open full directory/);
  assert.doesNotMatch(page, /href="\/admin\/confirmed-trips\/records"/);
  assert.doesNotMatch(loading, /Browse confirmed trips|href="\/admin\/confirmed-trips\/records"/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /tripDirectoryHref\(filters, directory\.nextCursor\)/);
  assert.match(page, /Older matching trips/);
  assert.match(recordsView, /encodeURIComponent\(trip\.id\)/);
  assert.match(directory, /await requireAdminSession\("\/admin\/confirmed-trips\/records"\)/);
  assert.match(page, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.match(page, /href="\/admin\/confirmed-trips\/monitoring"/);
});

test("main Trips workspace contains two compact sections and a visible Trip operations shortcut", () => {
  const markers = [
    'aria-labelledby="confirmed-trips-overview"',
    'aria-labelledby="trip-directory-title"',
  ];
  const positions = markers.map(m => page.indexOf(m));
  assert.ok(positions.every(p => p !== -1));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal((page.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.equal((page.match(/className="min-w-0 rounded-xl border border-slate-200\/80 bg-white px-4 py-3 sm:px-5 sm:py-4"/g) ?? []).length, 1);
  assert.match(page, /<section aria-labelledby="confirmed-trips-overview" className="min-w-0">/);
  assert.match(page, /<section aria-labelledby="trip-directory-title" id="trip-directory" className="min-w-0 rounded-xl border border-slate-200\/80 bg-white/);
  const parentStart = page.indexOf('<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">');
  const parentEnd = page.lastIndexOf("</AdminSectionCard>");
  const toolbarStart = page.indexOf('role="group" aria-label="Trip shortcuts"');
  assert.ok(parentStart >= 0 && toolbarStart > parentStart && toolbarStart < positions[0]);
  assert.ok(positions.every(position => position > parentStart && position < parentEnd));
  assert.match(page, /border-slate-200\/80 px-3 py-2\.5/);
  assert.doesNotMatch(page, /rounded-lg border border-slate-200\/80 bg-white px-3 py-2\.5/);
  assert.doesNotMatch(page, /TripCategoryCard|Trips by category/);
  assert.doesNotMatch(page, /Related trip operations|Detailed product and provider breakdowns|Confirmation integration readiness|Confirmation delivery health and alerts/);
  assert.doesNotMatch(page, /bg-slate-(?:50\/80|100\/65|100\/60|100\/80)/);
  assert.match(page, /grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5/);
  assert.doesNotMatch(page, /grid w-full min-w-\[850px\] grid-cols-5/);
});


test("Trip overview note and disconnected Tracking field are removed without losing valid controls", () => {
  const start = page.indexOf('<section aria-labelledby="confirmed-trips-overview"');
  const end = page.indexOf("</section>", start);
  const overview = page.slice(start, end);
  assert.doesNotMatch(overview, /Confirmed trips include cancelled records|Tracking totals require|<Info/);
  assert.match(overview, /label="Tracked trips" value="—"/);
  assert.match(overview, /screenReaderNote="Tracking reporting not connected"/);
  const fields = ["q", "provider", "product", "status", "range"];
  for (const field of fields) assert.match(controls, new RegExp('name="' + field + '"'));
  assert.doesNotMatch(controls, /name="tracking"|label="Tracking"|<span>Tracking<\/span>/);
  assert.match(controls, /value: "TRACKED", label: "Tracked".*disabled: true/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.statusCounts\.cancelled/);
  assert.match(page, /directory\.nextCursor/);
});

test("Trip overview retains five unboxed metrics with responsive divider lines", () => {
  const start = page.indexOf('<section aria-labelledby="confirmed-trips-overview"');
  const end = page.indexOf('</section>', start);
  const section = page.slice(start, end);
  assert.match(section, /<section aria-labelledby="confirmed-trips-overview" className="min-w-0">/);
  assert.match(section, /grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5/);
  assert.equal((section.match(/<TripMetric /g) ?? []).length, 5);
  for (let index = 0; index < 5; index++) {
    assert.ok(section.includes('<TripMetric index={' + index + '}'), 'Missing metric index ' + index);
  }
  assert.doesNotMatch(section, /rounded-lg border border-slate-200\/80 bg-white px-3 py-2\.5/);
  assert.doesNotMatch(section, /<Info|Confirmed trips include cancelled records|Tracking totals require a separate data source/);
  assert.doesNotMatch(section, /The counters reflect the filters applied|hint="/);
});

test("all five overview counters display the current filtered scope without clickable links or active styling", () => {
  for (const label of ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"]) {
    assert.ok(page.includes('label="' + label + '"'), "Missing metric: " + label);
  }
  assert.match(page, /parseAdminTripWorkspace\(raw\)/);
  assert.match(page, /listAdminConfirmedTrips\(filters\)/);
  assert.match(page, /directory\?\.status === "ok"/);
  assert.match(page, /label="Confirmed trips" value=\{directory\.totalMatching\}/);
  assert.match(page, /label="Upcoming" value=\{directory\.statusCounts\.upcoming\}/);
  assert.match(page, /label="Past" value=\{directory\.statusCounts\.past\}/);
  assert.match(page, /label="Cancelled" value=\{directory\.statusCounts\.cancelled\}/);
  const metric = page.slice(page.indexOf("function TripMetric({"), page.indexOf("export default async function AdminConfirmedTripsPage("));
  assert.match(metric, /index: number/);
  assert.match(metric, /border-slate-200\/80 px-3 py-2\.5/);
  assert.match(metric, /index < 4 \? "border-b lg:border-b-0 "/);
  assert.match(metric, /index % 2 === 1 \? "sm:border-l "/);
  assert.match(metric, /index > 0 \? "lg:border-l"/);
  assert.doesNotMatch(metric, /rounded-lg|bg-white|shadow|ring-indigo/);
  assert.doesNotMatch(metric, /<Link|href=|aria-current|active\s*=|ArrowRight|ring-indigo-100|border-indigo-300|hover:bg-indigo-50|cursor-pointer|cursor-not-allowed/);
  assert.doesNotMatch(page, /The counters reflect the filters applied in the Trip Directory/);
  assert.doesNotMatch(page, /hint=|\{hint\}/);
  assert.match(page, /screenReaderNote="Tracking reporting not connected"/);
  assert.match(metric, /<span className="sr-only">\{screenReaderNote\}<\/span>/);
  for (const description of [
    "All verified trips matching this scope",
    "Matching upcoming trips",
    "Matching past trips",
    "Matching cancelled trips",
  ]) assert.ok(!page.includes(description), description);
  assert.doesNotMatch(page, /Confirmed trips include cancelled records/);
  assert.doesNotMatch(page, /tripWorkspaceHref\(filters, range, \{ status:/);
  assert.match(recordsService, /const \[count, page, upcoming, past, cancelled\] = await db\.\$transaction/);
  for (const status of ["UPCOMING", "PAST", "CANCELLED"]) {
    assert.ok(recordsService.includes('db.myTrip.count({ where: { AND: [where, { status: "' + status + '" }] } })'));
  }
  assert.match(recordsService, /statusCounts:/);
});

test("tracked trips remain unavailable instead of showing fabricated totals", () => {
  assert.match(page, /label="Tracked trips" value="—"/);
  assert.match(page, /Tracking reporting not connected/);
  assert.doesNotMatch(page, /Tracking totals require a separate data source/);
  assert.doesNotMatch(controls, /<SearchMonitorSelect label="Tracking"|name="tracking"|<span>Tracking<\/span>/);
  assert.match(controls, /value: "TRACKED", label: "Tracked".*disabled: true/);
  assert.match(dropdown, /disabled=\{option\.disabled\}/);
  assert.match(dropdown, /aria-disabled=\{option\.disabled \|\| undefined\}/);
  assert.match(dropdown, /!option\.disabled/);
  assert.doesNotMatch(filterSource, /"TRACKED"/);
  assert.doesNotMatch(page, /operations\.metrics\.tracked|Math\.random|mockTrips|sampleTrips/);
  assert.doesNotMatch(page, /\{ status: "TRACKED" \}/);
});

test("Travel type dropdown is the only category selector on the Trips page", () => {
  for (const [value, label] of [
    ["all", "All"],
    ["FLIGHT", "Flights"],
    ["HOTEL", "Hotels"],
    ["CAR", "Cars"],
    ["PACKAGE", "Packages"],
  ]) {
    assert.match(controls, new RegExp('value: "' + value + '", label: "' + label + '"'));
  }
  assert.match(controls, /name="product" value=\{filters\.product\} options=\{productOptions\}/);
  assert.match(controls, /label="Travel type".*autoSubmit/);
  assert.match(page, /<TripFilterControls filters=\{filters\}/);
  assert.doesNotMatch(page + loading, /aria-label="Trip travel types"|tripCategories|tripWorkspaceHref|Trips by category|TripCategoryCard/);
  assert.match(operationsPage, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(breakdowns, /operations\.byProduct\.map/);
  assert.match(breakdowns, /operations\.byProvider\.map/);
  assert.match(breakdowns, /No providers or counts are assumed/);
});

test("redundant directory descriptions are absent without changing records or pagination", () => {
  assert.doesNotMatch(page, /Search verified records; filters use the latest signed confirmation date in UTC/);
  assert.doesNotMatch(controls, /UTC dates filter signed confirmation timestamps\. Tracking and precise minute-level ranges require a future integration/);
  assert.doesNotMatch(page, /Showing up to 20 records, newest confirmation first/);
  assert.match(page, /\{directory\.totalMatching\.toLocaleString\("en-US"\)\} matching verified trips/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.nextCursor/);
  assert.match(page, /tripDirectoryHref\(filters, directory\.nextCursor\)/);
  assert.match(controls, /href="\/admin\/confirmed-trips#trip-directory"/);
  assert.match(controls, /type="submit"/);
  assert.match(controls, /justify-end gap-2/);
});

test("the main directory uses authorized read-only filtered records, never the 20-row overview sample", () => {
  assert.match(page, /parseAdminTripWorkspace\(raw\)/);
  assert.match(page, /listAdminConfirmedTrips\(filters\)/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.totalMatching/);
  assert.match(page, /directory\.nextCursor/);
  assert.match(page, /tripDirectoryHref\(filters, directory\.nextCursor\)/);
  assert.match(page, /No provider-confirmed trip matches the selected filters/);
  assert.match(page, /Trip records are temporarily unavailable/);
  assert.match(page, /!parsed\.ok/);
  assert.doesNotMatch(page, /<RecentConfirmedTripTable|operations\.recentTrips\.map/);
  assert.match(recordsService, /source: "PARTNER_CONFIRMATION"/);
  assert.match(recordsService, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(recordsService, /isolationLevel: "RepeatableRead"/);
  assert.match(recordsService, /escapePrismaContainsQuery\(filters\.q\)/);
  assert.doesNotMatch(recordsService, /\.create\(|\.update\(|\.delete\(|\.upsert\(/);
});

test("five directory filters use a compact desktop row, simple labels and only the requested presets", () => {
  assert.match(page, /<TripFilterControls filters=\{filters\} range=\{range\}/);
  assert.doesNotMatch(page, /dateFields=\{dateFields\}/);
  assert.match(controls, /<form method="get" action="\/admin\/confirmed-trips"/);
  for (const name of ["q", "provider", "product", "status", "range"]) {
    assert.match(controls, new RegExp('name="' + name + '"'));
  }
  assert.doesNotMatch(controls, /name="from"|name="to"|type="date"/);
  assert.match(controls, /lg:grid-cols-\[minmax\(0,1\.4fr\).*minmax\(0,1\.15fr\)\]/);
  assert.match(controls, /sm:grid-cols-2 md:grid-cols-3/);
  assert.doesNotMatch(controls, /overflow-x-auto|overflow-x-scroll|min-w-\[\d+px\]/);
  for (const label of ["Search trips", "Provider", "Travel type", "Trip status", "Time range"]) {
    assert.ok(controls.includes(label), "Missing filter: " + label);
  }
  const products = controls.slice(controls.indexOf("const productOptions"), controls.indexOf("const statusOptions"));
  const statuses = controls.slice(controls.indexOf("const statusOptions"), controls.indexOf("const rangeOptions"));
  const ranges = controls.slice(controls.indexOf("const rangeOptions"), controls.indexOf("const fieldLabel"));
  assert.match(products, /\{ value: "all", label: "All" \}/);
  assert.match(statuses, /\{ value: "all", label: "Confirmed" \}/);
  assert.match(statuses, /\{ value: "TRACKED", label: "Tracked", disabled: true, description: "Not connected" \}/);
  assert.doesNotMatch(products + statuses, /All types|label: "Confirmed trips"|label: "Tracked trips"/);
  const options = Array.from(ranges.matchAll(/\{ value: "([^"]+)", label: "([^"]+)" \}/g)).map(([, value, label]) => [value, label]);
  assert.deepEqual(options, [
    ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["all", "All time"],
  ]);
  assert.doesNotMatch(ranges, /Custom dates|UTC days|shortLabel/);
  assert.match(controls, /name="range" value=\{range\} options=\{rangeOptions\}/);
  assert.match(controls, /name="status" value=\{filters\.status\} options=\{statusOptions\}/);
  assert.match(controls, /appearance="boxed"/);
  assert.match(controls, /autoSubmit/);
  assert.match(dropdown, /if \(!options\.some\(\(option\) => option\.value === next && !option\.disabled\)\) return/);
  assert.match(dropdown, /aria-haspopup="listbox"|role="listbox"/);
  assert.match(controls, /href="\/admin\/confirmed-trips#trip-directory"/);
  assert.match(workspace, /parseAdminTripFilters\(\{ \.\.\.raw, from, to \}\)/);
  assert.match(page, /if \(parsed\.ok && parsed\.range === "custom"\)/);
  assert.match(page, /redirect\(tripDirectoryHref\(parsed\.filters\)\)/);
  assert.match(directory, /<input type="date" name="from"/);
  assert.match(directory, /<input type="date" name="to"/);
  assert.match(loading, /lg:grid-cols-\[minmax\(0,1\.4fr\).*minmax\(0,1\.15fr\)\]/);
  assert.match(loading, /sm:grid-cols-2 md:grid-cols-3/);
  assert.doesNotMatch(page + controls, /<form method="post"|fetch\(|method:\s*["'](?:POST|PATCH|DELETE)/);
});

test("both directory views use genuine records and the same read-only details route", () => {
  assert.match(directory, /<TripDirectoryView rows=\{result\.rows\} \/>/);
  assert.match(recordsView, /"use client"/);
  assert.match(recordsView, /useState<"list" \| "grid">\("list"\)/);
  assert.match(recordsView, /subtle = false/);
  assert.match(recordsView, /subtle \? "border-slate-200\/80 bg-white"/);
  assert.match(recordsView, /aria-pressed=\{view === "list"\}/);
  assert.match(recordsView, /aria-pressed=\{view === "grid"\}/);
  assert.match(recordsView, /<ConfirmedTripRecordsTable rows=\{rows\} \/>/);
  assert.match(recordsView, /rows\.map\(\(trip\) =>/);
  assert.match(recordsView, /encodeURIComponent\(trip\.id\)/);
  assert.match(recordsView, /trip\.providerConfirmationCode/);
  assert.match(recordsView, /trip\.confirmedAt/);
  assert.match(recordsView, /trip\.needsStatusReview/);
  assert.match(recordsTable, /overflow-x-auto/);
  assert.doesNotMatch(recordsView, /mockRows|sampleData|random|Cancel booking|Refund now/);
});

test("unified Trip monitoring consolidates protected confirmation and flight-status panels", () => {
  assert.match(page, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.match(loading, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.doesNotMatch(page + loading, /href="\/admin\/flight-status"|href="\/admin\/confirmed-trips\/operations"/);
  assert.match(monitoringPage, /<AdminPageShell title="Trip monitoring" hideHeader>/);
  assert.match(monitoringPage, /await requireAdminSession\("\/admin\/confirmed-trips\/monitoring"\)/);
  assert.match(monitoringPage, /href="\/admin\/confirmed-trips"/);
  assert.match(monitoringPage, /Back to Trips/);
  assert.match(monitoringPage, /<TripConfirmationsMonitoringPanel expandDelivery=\{panel === "delivery"\} \/>/);
  assert.match(monitoringPage, /<TripFlightStatusMonitoringPanel \/>/);
  assert.match(monitoringPage, /id="trip-confirmations-panel" open=\{showConfirmations\}/);
  assert.match(monitoringPage, /id="trip-flight-status-panel" open=\{showFlightStatus\}/);
  assert.match(operationsRedirect, /await requireAdminSession\("\/admin\/confirmed-trips\/operations"\)/);
  assert.match(operationsRedirect, /redirect\("\/admin\/confirmed-trips\/monitoring\?panel=delivery#confirmation-delivery-health-title"\)/);
  assert.match(flightStatusRedirect, /redirect\("\/admin\/confirmed-trips\/monitoring\?panel=flight#flight-status-overview-title"\)/);
  assert.match(operationsPage, /Detailed product and provider breakdowns/);
  assert.match(operationsPage, /Confirmation integration readiness/);
  assert.match(operationsPage, /Confirmation delivery health and alerts/);
  assert.equal((operationsPage.match(/<details/g) ?? []).length, 3);
  assert.match(operationsPage, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(operationsPage, /getConfirmedTripsIntegrationReadiness\(\)/);
  assert.match(operationsPage, /getConfirmedTripsOperationsSnapshot\(\)/);
  assert.match(operationsPage, /getConfirmationDeliveryHealth\(\)/);
  assert.match(operationsPage, /readiness\.webhookCredentialConfigured/);
  assert.match(operationsPage, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
  assert.match(operationsPage, /A webhook setup does not mean a live feed or provider agreement/);
  assert.match(operationsPage, /Duffel search and KAYAK sandbox do not send booking confirmations/);
  assert.match(operationsPage, /!readiness\.feedReady \? \(/);
  assert.match(operationsPage, /Delivery data is unavailable\. No counts are assumed/);
  for (const property of [
    "deliveryHealth.receivedLast24h", "deliveryHealth.acceptedLast24h", "deliveryHealth.rejectedLast24h",
    "deliveryHealth.lastReceivedAt", "deliveryHealth.lastAcceptedAt", "deliveryHealth.lastRejectedAt",
    "deliveryHealth.providerName", "deliveryHealth.recent.map",
  ]) assert.ok(operationsPage.includes(property), property);
  assert.match(operationsPage, /readiness\.feedReady \? <ConfirmedTripDeliveryAlerts \/> : null/);
  assert.match(operationsPage, /id="confirmation-delivery-health-title"/);
  assert.match(operationsPage, /open=\{expandDelivery\}/);
  assert.doesNotMatch(operationsPage, /mockData|sampleTrips|Math\.random|process\.env/);
});

test("service preserves provider-confirmation trust boundary and no invented revenue", () => {
  assert.match(service, /source: "PARTNER_CONFIRMATION"/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(service, /partnerConfirmationLimits\.permittedClockSkewSeconds/);
  assert.match(service, /acceptedFutureBoundary/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.match(service, /getConfirmedTripsIntegrationReadiness/);
  assert.match(service, /isConfiguredPartnerConfirmationSecret/);
  assert.doesNotMatch(service, /CONFIRMATION_IMPORT|MIGRATED_LEGACY|_sum/);
  assert.doesNotMatch(page, /Revenue|GMV|Gross booking value|Total value|PARTNER_CONFIRMATION_WEBHOOK_SECRET|process\.env/);
  assert.doesNotMatch(navigation, /\/admin\/bookings/);
  assert.match(architecture, /"\/admin\/bookings"/);
  assert.doesNotMatch(page, /Confirmed trips include cancelled records/);
  assert.match(operationsPage, /Receipts may include retries/);
});

test("loading state mirrors two primary sections with a visible operations shortcut", () => {
  assert.match(loading, /<AdminPageShell title="Trips" hideHeader>/);
  for (const label of ["Trip overview", "Trip directory"]) {
    assert.ok(loading.includes(label), "Missing loading section: " + label);
    assert.ok(page.includes(label), "Missing loaded section: " + label);
  }
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /motion-safe:animate-pulse/);
  assert.equal((loading.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.equal((loading.match(/<section className="min-w-0 rounded-xl border border-slate-200\/80 bg-white/g) ?? []).length, 1);
  assert.match(loading, /<section className="min-w-0">\s*<h2 className="mb-3 text-base font-semibold text-slate-950">Trip overview<\/h2>/);
  assert.match(loading, /grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5/);
  assert.match(loading, /metricLabels\.map\(\(label, index\) =>/);
  assert.match(loading, /index < 4 \? "border-b lg:border-b-0 "/);
  assert.match(loading, /index % 2 === 1 \? "sm:border-l "/);
  assert.match(loading, /index > 0 \? "lg:border-l"/);
  assert.doesNotMatch(loading, /rounded-lg border border-slate-200\/80 bg-white px-3 py-2\.5/);
  assert.doesNotMatch(loading, /Loading counters for the selected trip filters/);
  assert.doesNotMatch(loading, /h-3 w-3\/4 rounded bg-slate-100/);
  assert.doesNotMatch(loading, /"All", "Flights", "Hotels", "Cars", "Packages"|aria-label="Trip travel types"/);
  assert.match(loading, /"Search trips", "Provider", "Travel type", "Trip status", "Time range"/);
  assert.doesNotMatch(loading, /"From \(UTC\)"|"To \(UTC\)"/);
  assert.doesNotMatch(loading, /"Tracking"|Not connected/);
  assert.doesNotMatch(loading, /Confirmed by type · all time|Trips by category|Related trip operations/);
  assert.doesNotMatch(loading, />\s*0\s*</);
});
