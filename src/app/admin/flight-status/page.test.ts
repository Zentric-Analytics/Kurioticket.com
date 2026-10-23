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
  assert.match(statusService, /return age >= 0 && age <= freshnessWindowMs \? "current" : "stale"/);
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
