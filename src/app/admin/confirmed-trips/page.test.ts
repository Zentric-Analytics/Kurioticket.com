import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const recent = readFileSync("src/components/admin/RecentConfirmedTripTable.tsx", "utf8");
const breakdowns = readFileSync("src/components/admin/ConfirmedTripsBreakdowns.tsx", "utf8");
const service = readFileSync("src/services/adminConfirmedTripsOperationsService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const architecture = readFileSync("src/lib/my-trips-architecture.test.ts", "utf8");

test("confirmed trips admin is a read-only provider-confirmation operations page", () => {
  assert.match(page, /title="Confirmed Trips"/);
  assert.doesNotMatch(page, /description="View trips confirmed by travel providers and monitor confirmation activity\."/);
  assert.match(page, /It stores verified signed provider confirmations/);
  assert.match(page, /Confirmation integration readiness/);
  assert.match(page, /Recent provider-confirmed trips/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.match(page, /No Kurioticket payment record/);
  assert.match(recent, /trip\.userEmail \|\| "Email unavailable"/);
  assert.doesNotMatch(page, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("confirmed trips service reads only genuine partner-confirmed My Trips", () => {
  assert.match(service, /source: "PARTNER_CONFIRMATION"/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.doesNotMatch(service, /CONFIRMATION_IMPORT/);
  assert.doesNotMatch(service, /MIGRATED_LEGACY/);
});

test("confirmed trips page does not invent an active confirmation provider feed", () => {
  assert.match(page, /Duffel search and KAYAK sandbox do not send booking confirmations/);
  assert.match(page, /Current search-provider confirmation feed/);
  assert.match(page, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
  assert.match(page, /A webhook setup does not mean a live feed or provider agreement/i);
  assert.match(page, /signed server-to-server callbacks from the configured provider/i);
});

test("confirmed trips readiness exposes configuration state without exposing the secret", () => {
  assert.match(service, /getConfirmedTripsIntegrationReadiness/);
  assert.match(service, /isConfiguredPartnerConfirmationSecret/);
  assert.match(service, /process\.env\.PARTNER_CONFIRMATION_WEBHOOK_SECRET/);
  assert.doesNotMatch(page, /PARTNER_CONFIRMATION_WEBHOOK_SECRET/);
  assert.doesNotMatch(page, /process\.env/);
});

test("confirmed trips avoids false revenue aggregation across currencies", () => {
  assert.doesNotMatch(service, /_sum/);
  assert.doesNotMatch(page, /Revenue|GMV|Gross booking value|Total value/);
});

test("confirmed trips keeps the metasearch architecture boundary", () => {
  assert.match(navigation, /href: "\/admin\/confirmed-trips"/);
  assert.doesNotMatch(navigation, /\/admin\/bookings/);
  assert.match(architecture, /"\/admin\/bookings"/);
  assert.match(page, /does not create bookings, payments, refunds, cancellations, or tickets/);
});

test("confirmed trips declares the database-scoped environment limitation", () => {
  assert.match(page, /Trips have no environment label/);
  assert.match(page, /shows records from the connected/);
  assert.doesNotMatch(service, /query: \{ path: \["environment"\]/);
});


test("confirmed-trip recency matches the signed webhook clock-skew allowance", () => {
  assert.match(service, /partnerConfirmationLimits\.permittedClockSkewSeconds/);
  assert.match(service, /acceptedFutureBoundary/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ gte: since, lte: acceptedFutureBoundary \}/);
});


test("confirmation readiness remains available when database telemetry is unavailable", () => {
  assert.match(page, /getConfirmedTripsIntegrationReadiness/);
  assert.match(page, /readiness\.webhookCredentialConfigured/);
  assert.doesNotMatch(page, /operations\?\.readiness\.webhookCredentialConfigured/);
});


test("confirmed-trip copy describes canonical confirmation state without overstating provider identity", () => {
  assert.match(page, /Trips with a provider confirmation in the last 24 hours, including updates\. Not a count of new bookings/);
  assert.match(page, /It stores verified signed provider confirmations/);
  assert.doesNotMatch(page, /approved external provider sent a valid signed confirmation/);
  assert.match(recent, /No signed provider confirmations have been accepted yet/i);
});


test("confirmed-trip readiness facts are rendered from authoritative readiness state", () => {
  assert.match(page, /readiness\.credentialModel === "single_provider_bound_secret" \? "Single provider \+ dedicated secret" : "Unknown"/);
  assert.match(page, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
});


test("Confirmed Trips UI uses one existing white parent with responsive summary and balanced breakdowns", () => {
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.equal((page.match(/<AdminSectionCard/g) || []).length, 1);
  assert.match(page, /grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(breakdowns, /grid items-start gap-3 lg:grid-cols-2/);
  assert.match(page, /<TripMetric label="Confirmed trips"/);
  assert.match(page, /<TripMetric label="Last 24h"/);
  assert.match(page, /<TripMetric label="Upcoming"/);
  assert.match(page, /<TripMetric label="Past"/);
  assert.match(page, /<TripMetric label="Cancelled"/);
  assert.match(page, /<section aria-labelledby="recent-confirmed-trips-title"/);
  assert.match(page, /<RecentConfirmedTripTable trips=\{operations\.recentTrips\}/);
  assert.match(recent, /min-w-\[880px\]/);
  assert.match(recent, /overflow-x-auto/);
});


test("Confirmed Trips preserves section order and primary toolbar links without jump shortcuts", () => {
  const order = [
    "confirmed-trips-overview",
    "recent-confirmed-trips-title",
    "confirmation-integration-title",
    "confirmation-delivery-health-title",
    "trips-operational-boundaries",
  ];
  const positions = order.map((id) => page.indexOf('aria-labelledby="' + id + '"'));
  const breakdownPosition = page.indexOf("<ConfirmedTripsBreakdowns operations={operations} />");
  assert.ok(positions.every((position) => position >= 0), "All overview sections remain present");
  assert.ok(positions[1] < breakdownPosition && breakdownPosition < positions[2],
    "Both breakdowns appear between recent trips and technical confirmation monitoring");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "Overview sections follow the Phase 1 reading order");
  const productIndex = breakdowns.indexOf('aria-labelledby="trips-by-product-title"');
  const providerIndex = breakdowns.indexOf('aria-labelledby="trips-by-provider-title"');
  assert.ok(productIndex >= 0 && providerIndex > productIndex, "Both breakdown panels remain in reading order");

  const actionsStart = page.indexOf('<div role="group" aria-label="Confirmed Trips actions"');
  const actionsEnd = page.indexOf('</div>', actionsStart);
  const panelStart = page.indexOf('<AdminSectionCard', actionsEnd);
  assert.ok(actionsStart >= 0 && actionsEnd > actionsStart && panelStart > actionsEnd, "The right-aligned action toolbar must precede Trip overview");
  const toolbar = page.slice(actionsStart, actionsEnd);
  assert.match(toolbar, /justify-end gap-2/);
  assert.match(toolbar, /href="\/admin\/confirmed-trips\/records"/);
  assert.match(toolbar, /Browse confirmed trips/);
  assert.match(toolbar, /href="\/admin\/flight-status"/);
  assert.match(toolbar, /Flight status/);
  assert.doesNotMatch(toolbar, /href="#/);

  assert.doesNotMatch(page, /description="View trips confirmed by travel providers and monitor confirmation activity\."/);
  assert.doesNotMatch(page, /Monitor provider-confirmed My Trips created by signed partner callbacks/);
  assert.doesNotMatch(page, /Jump to:|Confirmed Trips page shortcuts|href="#recent-confirmed-trips-title"|href="#confirmation-integration-title"|<nav\b|<ArrowDown\b/);
  assert.match(page, /id="recent-confirmed-trips-title"/);
  assert.match(page, /id="confirmation-integration-title"/);
  assert.match(page, /<RecentConfirmedTripTable trips=\{operations\.recentTrips\}/);
});



test("Confirmed Trips hides its visible introduction and preserves all sections", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(shell, /eyebrow = "Admin operations"/);
  assert.match(shell, /\{eyebrow \? <p/);
  assert.match(page, /<AdminPageShell\s+title="Confirmed Trips"\s+hideHeader>/);
  assert.doesNotMatch(page, /eyebrow="Admin operations"|Jump to:/);
  assert.doesNotMatch(page, /description="View trips confirmed by travel providers and monitor confirmation activity\."/);

  const markers = [
    'aria-labelledby="confirmed-trips-overview"',
    'aria-labelledby="recent-confirmed-trips-title"',
    "<ConfirmedTripsBreakdowns operations={operations} />",
    'aria-labelledby="confirmation-integration-title"',
    'aria-labelledby="confirmation-delivery-health-title"',
    'aria-labelledby="trips-operational-boundaries"',
  ];
  const positions = markers.map(marker => page.indexOf(marker));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal((page.match(/<ConfirmedTripsBreakdowns operations=\{operations\} \/>/g) || []).length, 1);
  for (const text of ["No counts are shown", "Monitoring inactive", "Delivery data is unavailable", "Provider handoff ≠ confirmation"]) {
    assert.ok(page.includes(text), "Critical read-only state preserved: " + text);
  }
});


test("Confirmed Trips has consistent typography without changing its section order", () => {
  assert.match(page, /<AdminPageShell\s+title="Confirmed Trips"\s+hideHeader>/);
  for (const id of ["confirmed-trips-overview", "recent-confirmed-trips-title", "confirmation-integration-title", "confirmation-delivery-health-title", "trips-operational-boundaries"]) {
    const heading = page.split("\n").find(line => line.includes('<h2 id="' + id + '"'));
    assert.ok(heading && heading.includes("text-base font-semibold") && heading.includes("tracking-tight"), id);
  }
  assert.match(page, /text-2xl font-semibold leading-7 tracking-tight tabular-nums/);
  for (const content of [page, breakdowns, recent]) assert.doesNotMatch(content, /text-\[11px\]/);
  assert.match(breakdowns, /grid items-start gap-3 lg:grid-cols-2/);
  assert.match(recent, /bg-slate-50 px-4 py-4 text-center/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.doesNotMatch(page, /Jump to:|Confirmed Trips page shortcuts/);
});


test("Confirmed Trips removes only the visible heading and description in both loaded and loading states", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  const loading = readFileSync("src/app/admin/confirmed-trips/loading.tsx", "utf8");
  assert.match(shell, /hideHeader\s*\?\s*<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(shell, /hideHeader \? "" : "mt-6"/);
  for (const source of [page, loading]) {
    assert.match(source, /<AdminPageShell title="Confirmed Trips" hideHeader>/);
    assert.doesNotMatch(source, /description=|eyebrow=|actions=\{|View trips confirmed by travel providers and monitor confirmation activity\./);
    const toolbar = source.match(/<div role="group" aria-label="Confirmed Trips actions" className="([^"]+)">([\s\S]*?)<\/div>/);
    assert.ok(toolbar, "Both screens must retain the same action toolbar");
    assert.match(toolbar[1], /mb-3/);
    assert.match(toolbar[1], /justify-end gap-2/);
    assert.match(toolbar[2], /href="\/admin\/confirmed-trips\/records"/);
    assert.match(toolbar[2], /href="\/admin\/flight-status"/);
    assert.equal((toolbar[2].match(/<Link\b/g) || []).length, 2);
    assert.ok(source.indexOf('role="group" aria-label="Confirmed Trips actions"') < source.indexOf("<AdminSectionCard"),
      "Action links should precede the white overview card");
  }
  assert.match(page, /<section aria-labelledby="confirmed-trips-overview"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(page, /<RecentConfirmedTripTable trips=\{operations\.recentTrips\} \/>/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
});


test("Confirmed Trips explanations are short without hiding confirmation or unavailable-data safeguards", () => {
  const descriptions = [
    "Overview of verified confirmed trips.",
    "Latest trips confirmed by travel providers.",
    "Confirmed trips by travel type.",
    "Confirmed trips from each provider.",
    "Provider confirmation setup and connection status.",
    "Tracks authenticated provider callbacks. Retries are not new bookings or trips.",
  ];
  for (const description of descriptions) {
    assert.ok([page, breakdowns].some(source => source.includes(description)),
      "Concise section explanation missing: " + description);
    assert.ok(description.length < 90, "Section subtitle should remain brief");
  }
  assert.match(page, /including updates\. Not a count of new bookings/);
  assert.match(page, /signed server-to-server callbacks from the configured provider/);
  assert.match(page, /A webhook setup does not mean a live feed or provider agreement/);
  assert.match(page, /Duffel search and KAYAK sandbox do not send booking confirmations/);
  assert.match(page, /It stores verified signed provider confirmations, but does not create bookings, payments, refunds, cancellations, or tickets/);
  assert.match(page, /Trips have no environment label/);
  assert.match(page, /No counts are shown/);
  assert.match(page, /Delivery data is unavailable\. No counts are assumed/);
  assert.match(breakdowns, /No providers or counts are assumed/);
  assert.match(recent, /No signed provider confirmations have been accepted yet/);
  assert.match(page, /<AdminPageShell title="Confirmed Trips" hideHeader>/);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(page, /<RecentConfirmedTripTable trips=\{operations\.recentTrips\} \/>/);
});

test("Phase 2 metric cards are compact, accessible and honest about zero values", () => {
  assert.match(page, /grid grid-cols-2 gap-2\.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5/);
  assert.match(page, /<h3 className="min-w-0 break-words text-\[13px\] font-medium leading-5/);
  assert.match(page, /new Intl\.NumberFormat\("en-US"\)\.format\(value\)/);
  assert.match(page, /tabular-nums/);
  assert.match(page, /Verified trip records/);
  assert.match(page, /Latest confirmation within 24h/);
  assert.match(page, /Not a count of new bookings/);
  assert.match(page, /tone=\{operations\.metrics\.cancelled > 0 \? "warn" : "neutral"\}/);
  assert.match(page, /tone=\{operations\.metrics\.upcoming > 0 \? "good" : "neutral"\}/);
  assert.doesNotMatch(page, /tone=\{operations\.metrics\.cancelled > 0 \? "warn" : "bad"\}/);

  const loading = readFileSync("src/app/admin/confirmed-trips/loading.tsx", "utf8");
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading confirmed-trip information/);
  assert.match(loading, /grid grid-cols-2 gap-2\.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5/);
  for (const label of ["Confirmed trips", "Last 24h", "Upcoming", "Past", "Cancelled"]) {
    assert.ok(loading.includes(label), "Loading placeholder missing: " + label);
  }
  assert.doesNotMatch(loading, />\s*0\s*</);
});

test("Phase 2 preserves server-sourced trip counts and unavailable telemetry", () => {
  for (const field of ["total", "confirmedLast24h", "upcoming", "past", "cancelled"]) {
    assert.ok(page.includes("operations.metrics." + field), "Metric must use operations snapshot: " + field);
  }
  assert.match(service, /source: "PARTNER_CONFIRMATION"/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(service, /status: "UPCOMING"/);
  assert.match(service, /status: "PAST"/);
  assert.match(service, /status: "CANCELLED"/);
  assert.match(page, /Trip counts unavailable/);
  assert.match(page, /No counts are shown/);
});

test("Confirmed Trips UI preserves honest data, alerts and no-booking boundaries", () => {
  assert.match(page, /getConfirmedTripsOperationsSnapshot\(\)/);
  assert.match(page, /getConfirmedTripsIntegrationReadiness\(\)/);
  for (const property of [
    "operations.metrics.total", "operations.metrics.confirmedLast24h",
    "operations.metrics.upcoming", "operations.metrics.past",
    "operations.metrics.cancelled",
  ]) assert.ok(page.includes(property), property);
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(breakdowns, /operations\.byProduct\.map/);
  assert.match(breakdowns, /operations\.byProvider\.map/);
  assert.match(page, /<RecentConfirmedTripTable trips=\{operations\.recentTrips\}/);
  assert.match(recent, /trips\.map\(\(trip\) =>/);
  for (const property of [
    "trip.userEmail", "trip.userId", "trip.providerConfirmationCode",
    "trip.origin", "trip.destination", "trip.departureDate",
    "trip.travelerCount", "trip.status", "trip.confirmedAt",
    "trip.providerName", "trip.tripType",
  ]) assert.ok(recent.includes(property), property);
  assert.match(page, /No counts are shown/);
  assert.match(recent, /No signed provider confirmations have been accepted yet/i);
  assert.match(page, /readiness.webhookCredentialConfigured/);
  assert.match(page, /readiness.currentSearchProviderConfirmationFeed === "none"/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.doesNotMatch(page, /<form|method:\s*["'](?:POST|PATCH|DELETE)/);
});

test("Confirmed Trips UI retains shell background and navigation while limiting changes to the page", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(shell, /border-slate-200 bg-white shadow-sm/);
  assert.match(page, /<Link href="\/admin\/confirmed-trips\/records"/);
  assert.match(page, /<Link href="\/admin\/flight-status"/);
  assert.doesNotMatch(page, /<Link href="#/);
  assert.doesNotMatch(page, /<Link href="\/admin\/(?:redirects|searches)"/);
  assert.match(page, /<AdminStatusBadge tone=\{readiness.feedReady/);
});


test("Confirmed Trips exposes all operational sections regardless of available trip telemetry", () => {
  const flightStatusPage = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
  assert.match(navigation, /href: "\/admin\/flight-status", parentHref: "\/admin\/confirmed-trips"/);
  assert.match(page, /<Link href="\/admin\/flight-status"/);
  assert.match(flightStatusPage, /getFlightStatusOperationsSnapshot/);

  const start = page.indexOf('<ConfirmedTripsBreakdowns operations={operations} />');
  const end = page.indexOf('<section aria-labelledby="confirmation-integration-title"', start);
  assert.ok(start >= 0 && end > start, "Product and provider panels remain unconditionally mounted");
  assert.match(breakdowns, /<section aria-labelledby="trips-by-product-title"/);
  assert.match(breakdowns, /<section aria-labelledby="trips-by-provider-title"/);
  assert.match(breakdowns, /Product breakdown unavailable/);
  assert.match(breakdowns, /Provider breakdown unavailable/);
  assert.equal((breakdowns.match(/!operations \? \(/g) || []).length, 2,
    "Both breakdowns must show honest unavailable-data states");
  assert.doesNotMatch(page, /\{operations \? \(\s*<ConfirmedTripsBreakdowns/);
  assert.match(page, /<section aria-labelledby="confirmed-trips-overview"/);
  assert.match(page, /<section aria-labelledby="confirmation-integration-title"/);
  assert.match(page, /<section aria-labelledby="recent-confirmed-trips-title"/);
  for (const source of [page, breakdowns]) {
    for (const match of source.matchAll(/className="([^"]*)"/g)) {
      const classes = match[1].split(/\s+/);
      assert.equal(
        classes.some(token => /^(?:[a-z0-9-]+:)*(?:hidden|invisible|opacity-0)$/.test(token)),
        false,
        "Confirmed Trips sections must not use a visibility-hiding utility",
      );
    }
  }
});


test("Phase 5 keeps both breakdowns visible, compact, and backed by real operations data", () => {
  assert.match(page, /<ConfirmedTripsBreakdowns operations=\{operations\} \/>/);
  assert.match(breakdowns, /grid items-start gap-3 lg:grid-cols-2/);
  assert.match(breakdowns, /operations\.byProduct\.length/);
  assert.match(breakdowns, /operations\.byProvider\.length/);
  assert.match(breakdowns, /operations\.byProduct\.map/);
  assert.match(breakdowns, /operations\.byProvider\.map/);
  assert.match(breakdowns, /item\.lastConfirmationAt/);
  assert.match(breakdowns, /item\.count/);
  assert.doesNotMatch(breakdowns, /min-h-36|items-stretch|opacity-0|md:grid-cols-5/);
  const boundaryHeading = page.match(/<h2 id="trips-operational-boundaries" className="([^"]+)">Operational boundaries<\/h2>/);
  assert.ok(boundaryHeading, "Operational boundaries heading must remain visible");
  const headingClasses = boundaryHeading[1].split(/\s+/);
  for (const className of ["text-base", "font-semibold", "leading-6", "text-slate-950"]) {
    assert.ok(headingClasses.includes(className), "Operational boundaries heading must retain " + className);
  }
  for (const text of [
    "Kurioticket is a travel search and referral platform",
    "It stores verified signed provider confirmations",
    "does not create bookings, payments, refunds, cancellations, or tickets",
    "Signed confirmations only",
    "Provider handoff ≠ confirmation",
    "No Kurioticket payment record",
    "Trips have no environment label",
    "shows records from the connected",
  ]) assert.ok(page.includes(text), "Important operational limit must remain: " + text);
});

test("Previously conditional trip records remain truthful and read-only", () => {
  assert.match(breakdowns, /operations\.byProduct\.map/);
  assert.match(breakdowns, /operations\.byProvider\.map/);
  assert.match(recent, /trips\.map\(\(trip\) =>/);
  assert.match(recent, /No provider-confirmed trips yet/);
  assert.match(page, /Recent trips couldn't be loaded from the database/);
  assert.match(breakdowns, /No counts are assumed/);
  assert.match(breakdowns, /No providers or counts are assumed/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.doesNotMatch(page, /<form|method:\s*["'](?:POST|PATCH|DELETE)/);
});


test("Phase 4 readiness is compact, truthful, and exposes all five configuration facts", () => {
  const start = page.indexOf('<section aria-labelledby="confirmation-integration-title"');
  const end = page.indexOf('<section aria-labelledby="confirmation-delivery-health-title"', start);
  const section = page.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(section, /px-4 py-3 sm:px-5 sm:py-4/);
  assert.match(section, /<dl className="mt-3 grid gap-x-5 gap-y-2\.5 border-y/);
  assert.match(section, /<dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2"/);
  for (const label of ["Endpoint", "Webhook credential model", "Configured provider", "Webhook credential", "Current search-provider confirmation feed"]) {
    assert.ok(section.includes('label="' + label + '"'), "Readiness fact must stay visible: " + label);
  }
  assert.match(section, /readiness\.providerName \|\| "None"/);
  assert.match(section, /readiness\.webhookCredentialConfigured \? "Configured" : "Not configured"/);
  assert.match(section, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
  assert.match(section, /readiness\.feedReady \? "info" : "warn"/);
  assert.match(section, /A webhook setup does not mean a live feed or provider agreement/);
  assert.doesNotMatch(section, /<details|aria-hidden="true" className=.*(?:facts|details)|md:grid-cols-5/);
});

test("Phase 4 delivery health keeps distinct inactive, unavailable, and genuine receipt states", () => {
  const start = page.indexOf('<section aria-labelledby="confirmation-delivery-health-title"');
  const end = page.indexOf('<section aria-labelledby="trips-operational-boundaries"', start);
  const section = page.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(section, /!readiness\.feedReady \? \(/);
  assert.match(section, /: !deliveryHealth \? \(/);
  assert.match(section, /No provider confirmation feed is configured/);
  assert.match(section, /Delivery data is unavailable/);
  assert.match(section, /No counts are assumed/);
  assert.match(section, /deliveryHealth\.receivedLast24h/);
  assert.match(section, /deliveryHealth\.acceptedLast24h/);
  assert.match(section, /deliveryHealth\.rejectedLast24h/);
  assert.match(section, /deliveryHealth\.lastReceivedAt/);
  assert.match(section, /deliveryHealth\.lastAcceptedAt/);
  assert.match(section, /deliveryHealth\.lastRejectedAt/);
  assert.match(section, /deliveryHealth\.providerName/);
  assert.match(section, /deliveryHealth\.recent\.length/);
  assert.match(section, /deliveryHealth\.recent\.map/);
  assert.match(section, /No authenticated provider callbacks recorded yet/);
  assert.match(section, /aria-label="Recent authenticated delivery receipts" tabIndex=\{0\}/);
  assert.match(section, /href="\/admin\/notifications"/);
  assert.match(section, /Receipts may include retries/);
  assert.doesNotMatch(section, /Cancel booking|Refund|Create confirmed trip/);
});

test("confirmation delivery health is read-only, provider-bound and truthful", () => {
  assert.match(page, /getConfirmationDeliveryHealth/);
  assert.match(page, /Confirmation delivery health/);
  assert.match(page, /!readiness.feedReady/);
  assert.match(page, /Delivery data is unavailable/);
  assert.match(page, /No counts are assumed/);
  assert.match(page, /deliveryHealth.rejectedLast24h/);
  assert.match(page, /Tracks authenticated provider callbacks\. Retries are not new bookings or trips/);
  assert.doesNotMatch(page, /Cancel booking|Refund trip|Create confirmed trip/);
});
