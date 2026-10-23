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
  assert.match(page, /value="None"/);
  assert.match(page, /configured webhook secret means the signed callback boundary is ready; it does not mean a provider agreement or live confirmation feed is active/i);
  assert.match(page, /there is no separate provider-name allowlist in the current contract/i);
});

test("confirmed trips readiness exposes configuration state without exposing the secret", () => {
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
