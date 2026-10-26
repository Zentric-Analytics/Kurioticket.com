import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { getPartnerConfirmationBinding } from "./partnerConfirmationDeliveryService";
import { deriveAdminAlertCandidates, type AdminAlertSignals } from "./adminAlertCore";

const previousSecret = process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET;
const previousName = process.env.PARTNER_CONFIRMATION_PROVIDER_NAME;
afterEach(() => {
  if (previousSecret === undefined) delete process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET;
  else process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET = previousSecret;
  if (previousName === undefined) delete process.env.PARTNER_CONFIRMATION_PROVIDER_NAME;
  else process.env.PARTNER_CONFIRMATION_PROVIDER_NAME = previousName;
});

test("provider-bound confirmation requires BOTH an explicit provider and a strong secret", () => {
  process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET = "A".repeat(48);
  delete process.env.PARTNER_CONFIRMATION_PROVIDER_NAME;
  assert.equal(getPartnerConfirmationBinding().configured, false);
  assert.equal(getPartnerConfirmationBinding().secret, null);

  process.env.PARTNER_CONFIRMATION_PROVIDER_NAME = "Example Provider";
  process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET = "short";
  assert.equal(getPartnerConfirmationBinding().configured, false);
  assert.equal(getPartnerConfirmationBinding().secret, null);

  process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET = "B".repeat(48);
  const configured = getPartnerConfirmationBinding();
  assert.equal(configured.configured, true);
  assert.equal(configured.providerName, "Example Provider");
  assert.equal(configured.secret, "B".repeat(48));
});

function baseSignals(): AdminAlertSignals {
  return {
    system: { databaseConfigured: true, databaseConnected: true, authConfigured: true, sessionConfigured: true, emailConfigured: true },
    providers: [],
    email: { dataAvailable: true, last24Hours: 0, failures: 0, delayed: 0, latestProblemAt: null, latestAdverseAt: null, latest: [] },
    cms: { available: false, totals: { scopes: 0, unhealthy: 0, unpublishedChanges: 0 }, unhealthyFingerprint: "", occurrenceToken: "" },
    homepageFares: { dataAvailable: true, globalReadinessStatus: "ready", underfilledMarkets: [] },
    telemetryOutageTokens: { providers: "none", email: "none", cms: "none", homepageFares: "none", flightStatus: "none" },
    flightStatus: { feedReady: false, operations: null },
  };
}

test("unconfigured confirmation feeds do not invent operational incidents", () => {
  const alerts = deriveAdminAlertCandidates({
    ...baseSignals(), confirmedTrips: { feedReady: false, health: null },
  });
  assert.equal(alerts.some(alert => alert.source === "CONFIRMED_TRIPS"), false);
});

test("a configured feed with unavailable delivery telemetry yields an alert, never fake zero counts", () => {
  const alerts = deriveAdminAlertCandidates({
    ...baseSignals(), confirmedTrips: { feedReady: true, health: null },
  }).filter(alert => alert.source === "CONFIRMED_TRIPS");
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].key, "confirmed-trips.telemetry.unavailable");
});

test("authenticated rejection activity raises a warning without expected-cadence assumptions", () => {
  const noRejections = deriveAdminAlertCandidates({
    ...baseSignals(), confirmedTrips: { feedReady: true, health: { rejectedLast24h: 0, lastRejectedAt: null } },
  }).filter(alert => alert.source === "CONFIRMED_TRIPS");
  assert.equal(noRejections.length, 0);

  const alerts = deriveAdminAlertCandidates({
    ...baseSignals(), confirmedTrips: { feedReady: true, health: { rejectedLast24h: 3, lastRejectedAt: "2026-10-26T12:00:00.000Z" } },
  }).filter(alert => alert.source === "CONFIRMED_TRIPS");
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, "WARNING");
  assert.equal(alerts[0].actionHref, "/admin/confirmed-trips");
  assert.match(alerts[0].message, /3 authenticated confirmation callback/);
});

test("delivery receipts contain only approved metadata and do not log raw sensitive fields", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const ingestion = readFileSync("src/services/partnerConfirmationDeliveryService.ts", "utf8");
  const admin = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
  const details = readFileSync("src/app/admin/confirmed-trips/records/[id]/page.tsx", "utf8");
  assert.match(schema, /model PartnerConfirmationDelivery/);
  assert.match(schema, /myTripId\s+String\?/);
  assert.match(ingestion, /partnerConfirmationDelivery.create/);
  assert.doesNotMatch(schema.slice(schema.indexOf("model PartnerConfirmationDelivery"), schema.indexOf("model FlightStatusSnapshot")), /rawBody|customerId|providerConfirmationCode|secret|signature|payload/i);
  assert.match(admin, /Delivery telemetry is unavailable/);
  assert.match(details, /Authenticated confirmation delivery history/);
  assert.doesNotMatch(ingestion, /console.log\(outcome|JSON.stringify\(outcome/);
});
