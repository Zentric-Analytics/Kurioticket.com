import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProviderIntegrationStatuses,
  type ProviderIntegrationEnvironment,
} from "./providerIntegrationStatus";

const ready: ProviderIntegrationEnvironment = {
  travelProviderMode: "production",
  duffelApiMode: "live",
  duffelConfigured: true,
  duffelBookingEnabled: false,
  duffelEnvironmentSafe: true,
  kayakConfigured: true,
  kayakRequested: true,
  kayakEnabled: true,
};

test("provider readiness reports configured live flight search without claiming booking", () => {
  const [duffel] = evaluateProviderIntegrationStatuses(ready);

  assert.deepEqual(duffel, {
    id: "duffel",
    provider: "Duffel",
    products: ["FLIGHTS"],
    state: "READY",
    configured: true,
    searchEnabled: true,
    externalHandoffEnabled: false,
    bookingEnabled: false,
    environment: "live",
    note: "Flight search is ready; booking remains disabled until an approved workflow is enabled.",
  });
});

test("provider readiness fails closed when live credentials or safety gates are missing", () => {
  const missingCredentials = evaluateProviderIntegrationStatuses({
    ...ready,
    duffelConfigured: false,
  })[0];
  const unsafeStaging = evaluateProviderIntegrationStatuses({
    ...ready,
    travelProviderMode: "staging",
    duffelApiMode: "test",
    duffelEnvironmentSafe: false,
  })[0];

  assert.equal(missingCredentials.state, "NOT_CONFIGURED");
  assert.equal(missingCredentials.searchEnabled, false);
  assert.equal(unsafeStaging.state, "ENVIRONMENT_BLOCKED");
  assert.equal(unsafeStaging.searchEnabled, false);
});

test("KAYAK sandbox is never reported ready outside its explicit gate", () => {
  const disabled = evaluateProviderIntegrationStatuses({
    ...ready,
    kayakRequested: false,
    kayakEnabled: false,
  })[1];
  const blocked = evaluateProviderIntegrationStatuses({
    ...ready,
    kayakEnabled: false,
  })[1];

  assert.equal(disabled.state, "DISABLED");
  assert.equal(blocked.state, "ENVIRONMENT_BLOCKED");
  assert.equal(blocked.searchEnabled, false);
  assert.equal(blocked.bookingEnabled, false);
});
