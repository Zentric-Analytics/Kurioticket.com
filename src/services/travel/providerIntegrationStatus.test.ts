import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProviderIntegrationStatuses,
  type ProviderIntegrationEnvironment,
} from "./providerIntegrationStatus";

const ready: ProviderIntegrationEnvironment = {
  duffelApiMode: "live",
  duffelConfigured: true,
  duffelBlockReason: null,
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
    note: "Flight search is ready. Direct Duffel booking is not implemented.",
  });
});

test("provider readiness fails closed for missing credentials and real provider gate failures", () => {
  const missingCredentials = evaluateProviderIntegrationStatuses({
    ...ready,
    duffelConfigured: false,
  })[0];
  const productionTestCredential = evaluateProviderIntegrationStatuses({
    ...ready,
    duffelBlockReason: "provider_mode_not_allowed",
  })[0];
  const stagingSafetyFailure = evaluateProviderIntegrationStatuses({
    ...ready,
    duffelApiMode: "test",
    duffelBlockReason: "staging_provider_test_mode_required",
  })[0];

  assert.equal(missingCredentials.state, "NOT_CONFIGURED");
  assert.equal(missingCredentials.searchEnabled, false);
  for (const blocked of [productionTestCredential, stagingSafetyFailure]) {
    assert.equal(blocked.state, "ENVIRONMENT_BLOCKED");
    assert.equal(blocked.searchEnabled, false);
    assert.equal(blocked.bookingEnabled, false);
  }
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
