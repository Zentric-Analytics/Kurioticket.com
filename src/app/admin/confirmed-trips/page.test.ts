import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const loading = readFileSync("src/app/admin/confirmed-trips/loading.tsx", "utf8");
const operationsPage = readFileSync("src/components/admin/TripConfirmationsMonitoringPanel.tsx", "utf8");
const monitoringPage = readFileSync("src/app/admin/confirmed-trips/monitoring/page.tsx", "utf8");
const tripWorkspaceNavigation = readFileSync("src/components/admin/TripWorkspaceNavigation.tsx", "utf8");
const operationsRedirect = readFileSync("src/app/admin/confirmed-trips/operations/page.tsx", "utf8");
const flightStatusRedirect = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
const directory = readFileSync("src/app/admin/confirmed-trips/records/page.tsx", "utf8");
const recordsView = readFileSync("src/components/admin/TripDirectoryView.tsx", "utf8");
const controls = readFileSync("src/components/admin/TripFilterControls.tsx", "utf8");
const dropdown = readFileSync("src/components/admin/SearchMonitorSelect.tsx", "utf8");
const workspace = readFileSync("src/lib/adminTripWorkspace.ts", "utf8");
const recordsTable = readFileSync("src/components/admin/ConfirmedTripRecordsTable.tsx", "utf8");
const flightMonitoring = readFileSync("src/components/admin/TripFlightStatusMonitoringPanel.tsx", "utf8");
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
  assert.match(page, /<TripWorkspaceNavigation active="trips" \/>/);
  assert.doesNotMatch(page, /role="group" aria-label="Trip shortcuts"/);
  assert.match(navigation, /href: "\/admin\/confirmed-trips", label: "Trips"/);
  assert.doesNotMatch(page, /href="\/admin\/confirmed-trips\/records"|Browse confirmed trips|Open full directory/);
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
  assert.match(recordsTable, /encodeURIComponent\(trip\.id\)/);
  assert.match(directory, /await requireAdminSession\("\/admin\/confirmed-trips\/records"\)/);
  assert.match(page, /<TripWorkspaceNavigation active="trips" \/>/);
});

test("main Trips workspace keeps the compact summary and records workspace without redundant headings", () => {
  const markers = [
    'aria-label="Trip summary"',
    'aria-label="Trip records"',
  ];
  const positions = markers.map(m => page.indexOf(m));
  assert.ok(positions.every(p => p !== -1));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal((page.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.match(page, /<div className="space-y-10 pt-6">/);
  assert.match(page, /<div className="mt-2">/);
  assert.doesNotMatch(page, /mt-3 border-t border-slate-100 pt-3/);
  assert.equal((page.match(/className="min-w-0 rounded-xl border border-slate-200\/80 bg-white px-4 py-3 sm:px-5 sm:py-4"/g) ?? []).length, 0);
  assert.match(page, /<section aria-label="Trip summary" className="min-w-0">/);
  assert.match(page, /<section aria-label="Trip records" id="trip-directory" className="min-w-0">/);
  assert.doesNotMatch(page, /<section aria-label="Trip records"[^>]*rounded-xl|<section aria-label="Trip records"[^>]*border border-slate-200/);
  assert.doesNotMatch(page, />Trip overview<|>Trip directory<|matching verified trips/);
  const parentStart = page.indexOf('<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">');
  const parentEnd = page.lastIndexOf("</AdminSectionCard>");
  const workspaceNavStart = page.indexOf('<TripWorkspaceNavigation active="trips" />');
  assert.ok(parentStart >= 0 && workspaceNavStart > parentStart && workspaceNavStart < positions[0]);
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
  const start = page.indexOf('<section aria-label="Trip summary"');
  const end = page.indexOf("</section>", start);
  const overview = page.slice(start, end);
  assert.doesNotMatch(overview, /Confirmed trips include cancelled records|Tracking totals require|<Info/);
  assert.match(overview, /label="Tracked trips" value="—"/);
  assert.match(overview, /screenReaderNote="Tracking reporting not connected"/);
  const fields = ["q", "provider", "product", "status", "identity", "range"];
  for (const field of fields) assert.match(controls, new RegExp('name="' + field + '"'));
  assert.doesNotMatch(controls, /name="tracking"|label="Tracking"|<span>Tracking<\/span>/);
  assert.match(controls, /value: "TRACKED", label: "Tracked".*disabled: true/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.statusCounts\.cancelled/);
  assert.match(page, /directory\.nextCursor/);
});

test("Trip overview retains five unboxed metrics with responsive divider lines", () => {
  const start = page.indexOf('<section aria-label="Trip summary"');
  const end = page.indexOf('</section>', start);
  const section = page.slice(start, end);
  assert.match(section, /<section aria-label="Trip summary" className="min-w-0">/);
  assert.doesNotMatch(section, />Trip overview</);
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

test("redundant directory labels and result count are absent without changing records or pagination", () => {
  assert.doesNotMatch(page, /Search verified records; filters use the latest signed confirmation date in UTC/);
  assert.doesNotMatch(controls, /UTC dates filter signed confirmation timestamps\. Tracking and precise minute-level ranges require a future integration/);
  assert.doesNotMatch(page, /Showing up to 20 records, newest confirmation first/);
  assert.doesNotMatch(page, /matching verified trips/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.nextCursor/);
  assert.match(page, /tripDirectoryHref\(filters, directory\.nextCursor\)/);
  assert.doesNotMatch(controls, /Clear filters|href="\/admin\/confirmed-trips#trip-directory"/);
  assert.match(controls, /type="submit"/);
  assert.match(controls, /h-8 items-center justify-center whitespace-nowrap rounded-md bg-indigo-700 px-2\.5 text-\[11px\]/);
});

test("the main directory uses authorized read-only filtered records, never the 20-row overview sample", () => {
  assert.match(page, /parseAdminTripWorkspace\(raw\)/);
  assert.match(page, /listAdminConfirmedTrips\(filters\)/);
  assert.match(page, /<TripDirectoryView rows=\{directory\.rows\} subtle \/>/);
  assert.match(page, /directory\.totalMatching/);
  assert.match(page, /directory\.nextCursor/);
  assert.match(page, /tripDirectoryHref\(filters, directory\.nextCursor\)/);
  assert.match(recordsTable, /No trips match the selected filters/);
  assert.match(page, /Trip records are temporarily unavailable/);
  assert.match(page, /!parsed\.ok/);
  assert.doesNotMatch(page, /<RecentConfirmedTripTable|operations\.recentTrips\.map/);
  assert.match(recordsService, /source: "PARTNER_CONFIRMATION"/);
  assert.match(recordsService, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(recordsService, /isolationLevel: "RepeatableRead"/);
  assert.match(recordsService, /escapePrismaContainsQuery\(filters\.q\)/);
  assert.doesNotMatch(recordsService, /\.create\(|\.update\(|\.delete\(|\.upsert\(/);
});

test("six directory filters use a compact left-anchored toolbar with a polished truthful identity dropdown", () => {
  assert.match(page, /<TripFilterControls filters=\{filters\} range=\{range\}/);
  assert.doesNotMatch(page, /dateFields=\{dateFields\}/);
  assert.match(controls, /<form method="get" action="\/admin\/confirmed-trips"/);
  for (const name of ["q", "provider", "product", "status", "identity", "range"]) {
    assert.match(controls, new RegExp('name="' + name + '"'));
  }
  assert.doesNotMatch(controls, /name="from"|name="to"|type="date"/);
  assert.match(controls, /flex min-w-0 flex-wrap items-end gap-x-2 gap-y-2\.5/);
  for (const width of ["sm:w-[180px]", "sm:w-[135px]", "sm:w-[110px]", "sm:w-[120px]"]) {
    assert.ok(controls.includes(width), "Missing compact toolbar width: " + width);
  }
  assert.doesNotMatch(controls, /grid-cols-|minmax\(0,1\.(?:35|05)fr\)/);
  assert.doesNotMatch(controls, /overflow-x-auto|overflow-x-scroll|min-w-\[\d+px\]/);
  for (const label of ["Search trips", "Provider", "Travel type", "Trip status", "Identity", "Time range"]) {
    assert.ok(controls.includes(label), "Missing filter: " + label);
  }
  const products = controls.slice(controls.indexOf("const productOptions"), controls.indexOf("const statusOptions"));
  const statuses = controls.slice(controls.indexOf("const statusOptions"), controls.indexOf("const rangeOptions"));
  const ranges = controls.slice(controls.indexOf("const rangeOptions"), controls.indexOf("const fieldLabel"));
  assert.match(products, /\{ value: "all", label: "All" \}/);
  assert.match(statuses, /\{ value: "all", label: "Confirmed" \}/);
  assert.match(statuses, /\{ value: "TRACKED", label: "Tracked", disabled: true \}/);
  assert.doesNotMatch(products + statuses, /All types|label: "Confirmed trips"|label: "Tracked trips"/);
  const options = Array.from(ranges.matchAll(/\{ value: "([^"]+)", label: "([^"]+)" \}/g)).map(([, value, label]) => [value, label]);
  assert.deepEqual(options, [
    ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["all", "All time"],
  ]);
  assert.doesNotMatch(ranges, /Custom dates|UTC days|shortLabel/);
  assert.match(controls, /name="identity" value=\{filters\.identity\} options=\{identityOptions\}/);
  assert.match(controls, /\{ value: "all", label: "All identities" \}/);
  assert.match(controls, /\{ value: "registered", label: "Registered" \}/);
  assert.match(controls, /\{ value: "guest", label: "Guest", disabled: true \}/);
  assert.match(controls, /name="range" value=\{range\} options=\{rangeOptions\}/);
  assert.match(controls, /name="status" value=\{filters\.status\} options=\{statusOptions\}/);
  assert.doesNotMatch(controls, /description: "Not connected"|description: "Provider-confirmed trips are account-linked"/);
  assert.match(controls, /appearance="boxed"/);
  assert.match(controls, /autoSubmit/);
  assert.match(dropdown, /if \(!options\.some\(\(option\) => option\.value === next && !option\.disabled\)\) return/);
  assert.match(dropdown, /aria-haspopup="listbox"|role="listbox"/);
  assert.doesNotMatch(controls, /Clear filters|href="\/admin\/confirmed-trips#trip-directory"/);
  assert.match(controls, /<button type="submit" className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md bg-indigo-700 px-2\.5 text-\[11px\]/);
  assert.match(controls, />Apply<\/button>/);
  assert.doesNotMatch(controls, />Apply filters<\/button>/);
  assert.match(workspace, /requested \|\| \(raw\.from \|\| raw\.to \? "custom" : "today"\)/);
  assert.match(workspace, /parseAdminTripFilters\(\{ \.\.\.raw, from, to \}\)/);
  assert.match(page, /if \(parsed\.ok && parsed\.range === "custom"\)/);
  assert.match(page, /redirect\(tripDirectoryHref\(parsed\.filters\)\)/);
  assert.match(directory, /<input type="date" name="from"/);
  assert.match(directory, /<input type="date" name="to"/);
  assert.match(loading, /flex min-w-0 flex-wrap items-end gap-x-2 gap-y-2\.5/);
  assert.match(loading, /"Search trips", "sm:w-\[180px\]"/);
  assert.match(loading, /"Provider", "sm:w-\[135px\]"/);
  assert.match(loading, /"Travel type", "sm:w-\[110px\]"/);
  assert.match(loading, /"Trip status", "sm:w-\[120px\]"/);
  assert.match(loading, /"Identity", "sm:w-\[135px\]"/);
  assert.match(loading, /"Time range", "sm:w-\[120px\]"/);
  assert.doesNotMatch(page + controls, /<form method="post"|fetch\(|method:\s*["'](?:POST|PATCH|DELETE)/);
});

test("Trips use one dedicated list backed by genuine records and the existing read-only details route", () => {
  assert.match(directory, /<TripDirectoryView rows=\{result\.rows\} \/>/);
  assert.doesNotMatch(recordsView, /useState|LayoutGrid|aria-pressed|Grid/);
  assert.match(recordsView, /<ConfirmedTripRecordsTable rows=\{rows\} \/>/);
  assert.match(recordsTable, /\["CREATED", "TYPE", "TRIP", "TRAVEL DATES", "PROVIDER", "IDENTITY", "STATUS", "ACTION"\]/);
  assert.match(recordsTable, /<thead className="border-b border-slate-200\/80 bg-slate-50\/90 text-\[10px\] text-slate-500">/);
  assert.match(recordsTable, /className="px-3 py-2\.5 font-semibold tracking-\[0\.08em\]"/);
  assert.match(recordsTable, /border-b border-slate-200\/80 bg-slate-50\/90/);
  assert.match(recordsTable, /rows\.length \? rows\.map\(trip =>/);
  assert.match(recordsTable, /colSpan=\{8\}/);
  assert.match(recordsTable, /No trips match the selected filters/);
  assert.match(recordsTable, /encodeURIComponent\(trip\.id\)/);
  assert.match(recordsTable, />Registered</);
  assert.match(recordsTable, /overflow-x-auto/);
  assert.doesNotMatch(recordsTable, /Latest stored provider-confirmed trips|Scroll the list horizontally on narrower screens/);
  assert.doesNotMatch(recordsView + recordsTable, /mockRows|sampleData|random|Cancel booking|Refund now/);
});

test("Trips and Trip monitoring use the Providers-style workspace navigation while preserving monitoring panels", () => {
  assert.match(page, /<TripWorkspaceNavigation active="trips" \/>/);
  assert.match(loading, /<TripWorkspaceNavigation active="trips" \/>/);
  assert.match(monitoringPage, /<TripWorkspaceNavigation active="monitoring" \/>/);
  assert.doesNotMatch(page + loading, /role="group" aria-label="Trip shortcuts"|href="\/admin\/flight-status"|href="\/admin\/confirmed-trips\/operations"/);
  assert.match(tripWorkspaceNavigation, /aria-label="Trip reporting sections"/);
  assert.match(tripWorkspaceNavigation, /href="\/admin\/confirmed-trips"/);
  assert.match(tripWorkspaceNavigation, /href="\/admin\/confirmed-trips\/monitoring"/);
  assert.match(tripWorkspaceNavigation, /inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-\[13px\] font-medium text-\[#020617\]/);
  assert.match(tripWorkspaceNavigation, /border-b border-\[#D8E1EC\]/);
  assert.match(tripWorkspaceNavigation, /gap-6/);
  assert.match(tripWorkspaceNavigation, /border-\[#004BB8\]/);
  assert.match(tripWorkspaceNavigation, /border-transparent hover:border-\[#D8E1EC\]/);
  assert.match(tripWorkspaceNavigation, /aria-current=\{active === "trips" \? "page" : undefined\}/);
  assert.match(tripWorkspaceNavigation, /aria-current=\{active === "monitoring" \? "page" : undefined\}/);
  assert.match(monitoringPage, /<AdminPageShell title="Trip monitoring" hideHeader>/);
  assert.match(monitoringPage, /await requireAdminSession\("\/admin\/confirmed-trips\/monitoring"\)/);
  assert.doesNotMatch(monitoringPage, /Back to Trips|ArrowLeft|Trip monitoring navigation/);
  assert.match(monitoringPage, /<section aria-label="Trip monitoring details" className="min-w-0 pt-6">/);
  assert.match(monitoringPage, /<TripConfirmationsMonitoringPanel \/>/);
  assert.match(monitoringPage, /<TripFlightStatusMonitoringPanel \/>/);
  assert.match(monitoringPage, /id="trip-confirmations-panel"/);
  assert.match(monitoringPage, /id="trip-flight-status-panel"/);
  assert.doesNotMatch(monitoringPage, /<details|<summary|ChevronDown|showConfirmations|showFlightStatus|requestedPanel/);
  assert.match(monitoringPage, /className="space-y-8"/);
  assert.match(monitoringPage, /id="trip-confirmations-panel"[^>]*className="min-w-0"/);
  assert.match(monitoringPage, /id="trip-flight-status-panel"[^>]*className="min-w-0 border-t border-slate-200\/80 pt-6"/);
  assert.doesNotMatch(monitoringPage, /id="trip-confirmations-panel"[^>]*rounded-xl|id="trip-flight-status-panel"[^>]*rounded-xl/);
  assert.match(operationsRedirect, /await requireAdminSession\("\/admin\/confirmed-trips\/operations"\)/);
  assert.match(operationsRedirect, /redirect\("\/admin\/confirmed-trips\/monitoring\?panel=delivery#confirmation-delivery-health-title"\)/);
  assert.match(flightStatusRedirect, /redirect\("\/admin\/confirmed-trips\/monitoring\?panel=flight#flight-status-overview-title"\)/);
  assert.match(operationsPage, /Detailed product and provider breakdowns/);
  assert.match(operationsPage, /Confirmation integration readiness/);
  assert.match(operationsPage, /Confirmation delivery health and alerts/);
  assert.equal((operationsPage.match(/<details/g) ?? []).length, 0);
  assert.equal((operationsPage.match(/<summary/g) ?? []).length, 0);
  assert.doesNotMatch(operationsPage, /ChevronDown|cursor-pointer|group-open:rotate-180/);
  assert.match(operationsPage, /className="min-w-0 space-y-4"/);
  assert.match(operationsPage, /aria-labelledby="confirmation-breakdowns-title" className="min-w-0"/);
  assert.doesNotMatch(operationsPage, /aria-labelledby="confirmation-breakdowns-title"[^>]*rounded-xl/);
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
  assert.match(operationsPage, /id="confirmation-integration-title"/);
  assert.match(operationsPage, /id="confirmation-breakdowns-title"/);
  assert.doesNotMatch(operationsPage, /expandDelivery|open=\{/);
  assert.doesNotMatch(operationsPage, /mockData|sampleTrips|Math\.random|process\.env/);
  assert.match(flightMonitoring, /className="min-w-0 space-y-4"/);
  assert.equal((flightMonitoring.match(/rounded-xl border border-slate-200\/80 bg-white p-3 sm:p-4/g) ?? []).length, 5);
  assert.doesNotMatch(flightMonitoring, /AdminSectionCard/);
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

test("loading state mirrors the streamlined summary, six filters and list shell", () => {
  assert.match(loading, /<AdminPageShell title="Trips" hideHeader>/);
  assert.doesNotMatch(loading + page, />Trip overview<|>Trip directory</);
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /aria-busy="true" className="space-y-10 pt-6"/);
  assert.match(loading, /motion-safe:animate-pulse/);
  assert.equal((loading.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.equal((loading.match(/<section aria-label="Trip records" className="min-w-0">/g) ?? []).length, 1);
  assert.doesNotMatch(loading, /<section aria-label="Trip records"[^>]*rounded-xl|<section aria-label="Trip records"[^>]*border border-slate-200/);
  assert.match(loading, /<section aria-label="Trip summary" className="min-w-0">/);
  assert.match(loading, /grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5/);
  assert.match(loading, /metricLabels\.map\(\(label, index\) =>/);
  assert.match(loading, /index < 4 \? "border-b lg:border-b-0 "/);
  assert.match(loading, /index % 2 === 1 \? "sm:border-l "/);
  assert.match(loading, /index > 0 \? "lg:border-l"/);
  assert.doesNotMatch(loading, /rounded-lg border border-slate-200\/80 bg-white px-3 py-2\.5/);
  assert.doesNotMatch(loading, /Loading counters for the selected trip filters/);
  assert.doesNotMatch(loading, /h-3 w-3\/4 rounded bg-slate-100/);
  assert.doesNotMatch(loading, /"All", "Flights", "Hotels", "Cars", "Packages"|aria-label="Trip travel types"/);
  for (const label of ["Search trips", "Provider", "Travel type", "Trip status", "Identity", "Time range"]) {
    assert.ok(loading.includes(label), "Missing loading filter: " + label);
  }
  assert.match(loading, /<div className="h-8 w-20 rounded-md bg-slate-100 motion-safe:animate-pulse" \/>/);
  assert.match(loading, /className="mt-2 overflow-hidden rounded-lg border border-slate-200"/);
  assert.match(loading, /"CREATED", "TYPE", "TRIP", "TRAVEL DATES", "PROVIDER", "IDENTITY", "STATUS", "ACTION"/);
  assert.match(loading, /text-\[10px\] font-semibold tracking-\[0\.08em\] text-slate-500/);
  assert.doesNotMatch(loading, /"From \(UTC\)"|"To \(UTC\)"/);
  assert.doesNotMatch(loading, /"Tracking"|Not connected/);
  assert.doesNotMatch(loading, /Confirmed by type · all time|Trips by category|Related trip operations/);
  assert.doesNotMatch(loading, />\s*0\s*</);
});
