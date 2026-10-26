import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const service = readFileSync("src/services/adminConfirmedTripsOperationsService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const architecture = readFileSync("src/lib/my-trips-architecture.test.ts", "utf8");

test("confirmed trips admin is a read-only provider-confirmation operations page", () => {
  assert.match(page, /title="Confirmed Trips"/);
  assert.match(page, /provider-confirmed My Trips created by signed partner callbacks/);
  assert.match(page, /Confirmation integration readiness/);
  assert.match(page, /Recent provider-confirmed trips/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.match(page, /No Kurioticket payment record/);
  assert.match(page, /trip\.userEmail \|\| "Email unavailable"/);
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
  assert.match(page, /Current Duffel search and KAYAK sandbox integrations do not send booking confirmations/);
  assert.match(page, /Current search-provider confirmation feed/);
  assert.match(page, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
  assert.match(page, /configured webhook secret means the signed callback boundary is ready; it does not mean a provider agreement or live confirmation feed is active/i);
  assert.match(page, /binds the signing secret to a single configured provider/i);
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
  assert.match(page, /It does not create a Kurioticket booking, payment, refund, cancellation or ticketing record/);
});

test("confirmed trips declares the database-scoped environment limitation", () => {
  assert.match(page, /MyTrip rows do not carry an environment column/);
  assert.match(page, /reports the database connected to the current/);
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
  assert.match(page, /Trips whose latest provider-confirmation timestamp is within 24h/);
  assert.match(page, /Kurioticket accepted a valid signed partner confirmation and stored it as trusted trip data/);
  assert.doesNotMatch(page, /approved external provider sent a valid signed confirmation/);
  assert.match(page, /no accepted signed partner callback has created a confirmed My Trip/i);
});


test("confirmed-trip readiness facts are rendered from authoritative readiness state", () => {
  assert.match(page, /readiness\.credentialModel === "single_provider_bound_secret" \? "Single provider \+ dedicated secret" : "Unknown"/);
  assert.match(page, /readiness\.currentSearchProviderConfirmationFeed === "none" \? "None" : "Configured"/);
});


test("Confirmed Trips UI uses one existing white parent with responsive summary and balanced breakdowns", () => {
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-6 lg:p-7">/);
  assert.equal((page.match(/<AdminSectionCard/g) || []).length, 1);
  assert.match(page, /grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5/);
  assert.match(page, /grid items-stretch gap-4 lg:grid-cols-2/);
  assert.match(page, /<TripMetric label="Confirmed trips"/);
  assert.match(page, /<TripMetric label="Last 24h"/);
  assert.match(page, /<TripMetric label="Upcoming"/);
  assert.match(page, /<TripMetric label="Past"/);
  assert.match(page, /<TripMetric label="Cancelled"/);
  assert.match(page, /<section aria-labelledby="recent-confirmed-trips-title"/);
  assert.match(page, /min-w-\[1000px\]/);
  assert.match(page, /overflow-x-auto/);
});

test("Confirmed Trips UI preserves honest data, alerts and no-booking boundaries", () => {
  assert.match(page, /getConfirmedTripsOperationsSnapshot\(\)/);
  assert.match(page, /getConfirmedTripsIntegrationReadiness\(\)/);
  for (const property of [
    "operations.metrics.total", "operations.metrics.confirmedLast24h",
    "operations.metrics.upcoming", "operations.metrics.past",
    "operations.metrics.cancelled", "operations.byProduct.map",
    "operations.byProvider.map", "operations.recentTrips.map",
    "trip.userEmail", "trip.userId", "trip.providerConfirmationCode",
    "trip.origin", "trip.destination", "trip.departureDate",
    "trip.travelerCount", "trip.status",
  ]) assert.ok(page.includes(property), property);
  assert.match(page, /No zero values were invented/);
  assert.match(page, /no accepted signed partner callback has created a confirmed My Trip/i);
  assert.match(page, /readiness.webhookCredentialConfigured/);
  assert.match(page, /readiness.currentSearchProviderConfirmationFeed === "none"/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.doesNotMatch(page, /<form|method:\s*["'](?:POST|PATCH|DELETE)/);
});

test("Confirmed Trips UI retains shell background and navigation while limiting changes to the page", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(shell, /border-slate-200 bg-white shadow-sm/);
  assert.match(page, /<Link href="\/admin\/redirects"/);
  assert.match(page, /<Link href="\/admin\/searches"/);
  assert.match(page, /<AdminStatusBadge tone=\{readiness.webhookCredentialConfigured/);
});


test("Confirmed Trips exposes all operational sections regardless of available trip telemetry", () => {
  const flightStatusPage = readFileSync("src/app/admin/flight-status/page.tsx", "utf8");
  assert.match(navigation, /href: "\/admin\/flight-status", parentHref: "\/admin\/confirmed-trips"/);
  assert.match(page, /<Link href="\/admin\/flight-status"/);
  assert.match(flightStatusPage, /getFlightStatusOperationsSnapshot/);

  const start = page.indexOf('<div className="grid items-stretch gap-4 lg:grid-cols-2">');
  const end = page.indexOf('<section aria-labelledby="trips-operational-boundaries"', start);
  assert.ok(start >= 0 && end > start, "product and provider panels must remain present");
  const breakdowns = page.slice(start, end);
  assert.match(breakdowns, /<section aria-labelledby="trips-by-product-title"/);
  assert.match(breakdowns, /<section aria-labelledby="trips-by-provider-title"/);
  assert.match(breakdowns, /Product breakdown unavailable/);
  assert.match(breakdowns, /Provider breakdown unavailable/);
  assert.equal((breakdowns.match(/!operations \? \(/g) || []).length, 2,
    "both breakdowns must show honest unavailable-data states");
  assert.doesNotMatch(page, /\{operations \? \(\s*<div className="grid items-stretch/);
  assert.match(page, /<section aria-labelledby="confirmed-trips-overview"/);
  assert.match(page, /<section aria-labelledby="confirmation-integration-title"/);
  assert.match(page, /<section aria-labelledby="recent-confirmed-trips-title"/);
  assert.doesNotMatch(page, /className="[^"]*(?:\bhidden\b|\binvisible\b|\bopacity-0\b)/);
});

test("Previously conditional trip records remain truthful and read-only", () => {
  assert.match(page, /operations\.byProduct\.map/);
  assert.match(page, /operations\.byProvider\.map/);
  assert.match(page, /operations\.recentTrips\.map/);
  assert.match(page, /No provider-confirmed trips yet/);
  assert.match(page, /Recent trip records are unavailable because the confirmed-trip database query could not be completed/);
  assert.match(page, /No counts are assumed/);
  assert.match(page, /No providers or counts are assumed/);
  assert.match(page, /Provider handoff ≠ confirmation/);
  assert.doesNotMatch(page, /<form|method:\s*["'](?:POST|PATCH|DELETE)/);
});


test("confirmation delivery health is read-only, provider-bound and truthful", () => {
  assert.match(page, /getConfirmationDeliveryHealth/);
  assert.match(page, /Confirmation delivery health/);
  assert.match(page, /!readiness.feedReady/);
  assert.match(page, /Delivery telemetry is unavailable/);
  assert.match(page, /No delivery counts have been assumed/);
  assert.match(page, /deliveryHealth.rejectedLast24h/);
  assert.match(page, /Authenticated provider callback receipts/);
  assert.doesNotMatch(page, /Cancel booking|Refund trip|Create confirmed trip/);
});
