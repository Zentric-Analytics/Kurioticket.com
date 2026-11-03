import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const loading = readFileSync("src/app/admin/confirmed-trips/loading.tsx", "utf8");
const directory = readFileSync("src/app/admin/confirmed-trips/records/page.tsx", "utf8");
const recordsView = readFileSync("src/components/admin/TripDirectoryView.tsx", "utf8");
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
  assert.match(page, /href="\/admin\/confirmed-trips\/records"/);
  assert.match(page, /href="\/admin\/flight-status"/);
  assert.match(shell, /border-slate-200 bg-white shadow-sm/);
  assert.doesNotMatch(page, /Admin operations|Jump to:/);
  assert.doesNotMatch(page, /Kurioticket handles refunds|Cancel booking|Issue ticket/);
});

test("one white parent card holds four white thin-bordered sections in the approved reading order", () => {
  const markers = [
    'aria-labelledby="confirmed-trips-overview"',
    'aria-labelledby="trip-categories-title"',
    'aria-labelledby="trip-directory-title"',
    'aria-labelledby="related-trip-operations-title"',
  ];
  const positions = markers.map(m => page.indexOf(m));
  assert.ok(positions.every(p => p !== -1));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal((page.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.equal((page.match(/className="min-w-0 rounded-xl border border-slate-200\/80 bg-white px-4 py-3 sm:px-5 sm:py-4"/g) ?? []).length, 4);
  const parentStart = page.indexOf('<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">');
  const parentEnd = page.lastIndexOf("</AdminSectionCard>");
  const toolbarStart = page.indexOf('role="group" aria-label="Trip shortcuts"');
  assert.ok(parentStart >= 0 && toolbarStart > parentStart && toolbarStart < positions[0]);
  assert.doesNotMatch(page, /text-2xl font-semibold tracking-tight text-slate-950">Trips/);
  assert.ok(positions.every(position => position > parentStart && position < parentEnd));
  assert.match(page, /bg-white px-3 py-3/);
  assert.match(page, /bg-white p-3\.5/);
  assert.match(page, /group rounded-xl border border-slate-200\/80 bg-white/);
  assert.doesNotMatch(page, /bg-slate-(?:50\/80|100\/65|100\/60|100\/80)/);
  assert.doesNotMatch(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5">/);
  assert.match(page, /grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5/);
  assert.match(page, /grid min-w-0 items-stretch gap-3 lg:grid-cols-3/);
  assert.doesNotMatch(page, /grid w-full min-w-\[850px\] grid-cols-5/);
});

test("all trustworthy status totals open exact filtered record routes", () => {
  for (const label of ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"]) {
    assert.ok(page.includes('label="' + label + '"'), "Missing metric: " + label);
  }
  assert.match(page, /label="Confirmed trips" value=\{operations\.metrics\.total\}/);
  assert.match(page, /label="Upcoming" value=\{operations\.metrics\.upcoming\}/);
  assert.match(page, /label="Past" value=\{operations\.metrics\.past\}/);
  assert.match(page, /label="Cancelled" value=\{operations\.metrics\.cancelled\}/);
  assert.match(page, /href="\/admin\/confirmed-trips\/records\?status=UPCOMING"/);
  assert.match(page, /href="\/admin\/confirmed-trips\/records\?status=PAST"/);
  assert.match(page, /href="\/admin\/confirmed-trips\/records\?status=CANCELLED"/);
  assert.match(page, /<Link href=\{href\}/);
  assert.match(page, /focus-visible:ring-2/);
});

test("tracked-trip metrics remain explicitly disconnected instead of equating confirmed trips with tracking", () => {
  assert.match(page, /label="Tracked trips" value="—"/);
  assert.match(page, /Tracking begins at confirmation once integrated/);
  assert.match(page, /Tracking totals require a separate future data source/);
  assert.match(page, /Tracked trips<\/dt><dd[^>]*>Not connected/);
  assert.match(page, /Cancelled trips<\/dt><dd[^>]*>Count pending integration/);
  assert.doesNotMatch(page, /operations\.metrics\.tracked|Math\.random|mockTrips|sampleTrips/);
});

test("category counts use actual provider-confirmed product grouping and retain future products", () => {
  for (const type of ["FLIGHT", "HOTEL", "CAR"]) assert.ok(page.includes('type: "' + type + '"'));
  assert.match(page, /operations\.byProduct\.find\(\(item\) => item\.tripType === type\)\?\.count \?\? 0/);
  assert.match(page, /tripDirectoryHref\(\{ \.\.\.blankFilters, product: type \}\)/);
  assert.match(page, /tripDirectoryHref\(\{ \.\.\.blankFilters, product: type, status: "UPCOMING" \}\)/);
  assert.match(page, /tripDirectoryHref\(\{ \.\.\.blankFilters, product: type, status: "CANCELLED" \}\)/);
  assert.match(page, /Package and additional product types remain available/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(breakdowns, /operations\.byProduct\.map/);
  assert.match(breakdowns, /operations\.byProvider\.map/);
  assert.match(breakdowns, /No providers or counts are assumed/);
});

test("the main directory uses authorized read-only filtered records, never the 20-row overview sample", () => {
  assert.match(page, /parseAdminTripFilters\(raw\)/);
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

test("main directory controls expose only supported search, provider, category, status and UTC-date filters", () => {
  assert.match(page, /<form method="get" action="\/admin\/confirmed-trips"/);
  for (const key of ["q", "provider", "product", "status", "from", "to"]) {
    assert.match(page, new RegExp('name="' + key + '"'));
    assert.match(filterSource, new RegExp('"' + key + '"'));
  }
  assert.match(page, /Precise 10- and 30-minute filters and tracking health require backend integration/);
  assert.match(page, /Precise time range requires backend integration/);
  assert.match(page, /Last 10 minutes \(planned\)/);
  assert.match(page, /Last 30 minutes \(planned\)/);
  assert.match(page, /Tracking health requires backend integration/);
  assert.match(page, /select disabled defaultValue="planned"/);
  assert.match(page, /select disabled defaultValue="unavailable"/);
  assert.match(page, /type="date"/);
  assert.match(page, /href="\/admin\/confirmed-trips#trip-directory"/);
  assert.doesNotMatch(page, /<form method="post"|fetch\(|method:\s*["'](?:POST|PATCH|DELETE)/);
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

test("related trip operations remain available with all real readiness and delivery states", () => {
  assert.match(page, /Related trip operations/);
  assert.match(page, /Detailed product and provider breakdowns/);
  assert.match(page, /Confirmation integration readiness/);
  assert.match(page, /Confirmation delivery health and alerts/);
  assert.match(page, /<details className="group/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(page, /getConfirmedTripsIntegrationReadiness\(\)/);
  assert.match(page, /readiness\.webhookCredentialConfigured/);
  assert.match(page, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
  assert.match(page, /A webhook setup does not mean a live feed or provider agreement/);
  assert.match(page, /Duffel search and KAYAK sandbox do not send booking confirmations/);
  assert.match(page, /!readiness\.feedReady \? \(/);
  assert.match(page, /Delivery data is unavailable\. No counts are assumed/);
  for (const property of [
    "deliveryHealth.receivedLast24h", "deliveryHealth.acceptedLast24h", "deliveryHealth.rejectedLast24h",
    "deliveryHealth.lastReceivedAt", "deliveryHealth.lastAcceptedAt", "deliveryHealth.lastRejectedAt",
    "deliveryHealth.providerName", "deliveryHealth.recent.map",
  ]) assert.ok(page.includes(property), property);
  assert.match(page, /readiness\.feedReady \? <ConfirmedTripDeliveryAlerts \/> : null/);
  assert.match(page, /id="confirmation-delivery-health-title"/);
  assert.match(page, /href="\/admin\/flight-status"/);
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
  assert.match(page, /including updates\. Not a count of new bookings/);
  assert.match(page, /Receipts may include retries/);
});

test("loading state matches the overview, category, directory and operations structure without false counts", () => {
  assert.match(loading, /<AdminPageShell title="Trips" hideHeader>/);
  for (const label of ["Trip overview", "Trips by category", "Trip directory", "Related trip operations"]) {
    assert.ok(loading.includes(label), "Missing loading section: " + label);
    assert.ok(page.includes(label), "Missing loaded section: " + label);
  }
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /motion-safe:animate-pulse/);
  assert.equal((loading.match(/<AdminSectionCard/g) ?? []).length, 1);
  assert.equal((loading.match(/<section className="min-w-0 rounded-xl border border-slate-200\/80 bg-white/g) ?? []).length, 4);
  assert.match(loading, /rounded-xl border border-slate-200\/80 bg-white/);
  assert.doesNotMatch(loading, /text-2xl font-semibold tracking-tight text-slate-950">Trips|View verified provider-confirmed trips across flights, hotels, and cars/);
  assert.doesNotMatch(loading, />\s*0\s*</);
});
