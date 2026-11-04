import assert from "node:assert/strict";
import test from "node:test";
import { deriveAdminAlertCandidates, type AdminAlertSignals } from "./adminAlertCore";
function base(): AdminAlertSignals {
  return {
    system: { databaseConfigured: true, databaseConnected: true, authConfigured: true, sessionConfigured: true, emailConfigured: true },
    providers: [], email: { dataAvailable: true, last24Hours: 0, failures: 0, delayed: 0, latestProblemAt: null, latestAdverseAt: null, latest: [] },
    cms: { available: true, totals: { scopes: 0, unhealthy: 0, unpublishedChanges: 0 }, unhealthyFingerprint: "none", occurrenceToken: "integrity" },
    homepageFares: { dataAvailable: true, globalReadinessStatus: "ready", underfilledMarkets: [] },
    telemetryOutageTokens: { providers: "p", email: "e", cms: "cms-outage", homepageFares: "h", flightStatus: "f" },
    flightStatus: { feedReady: false, operations: null },
  };
}
test("unavailable CMS snapshots produce an alert instead of silently reporting no issues", () => {
  for (const cms of [null, { ...base().cms!, available: false }]) {
    const alerts = deriveAdminAlertCandidates({ ...base(), cms });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].key, "cms.health.unavailable");
    assert.equal(alerts[0].signalToken, "cms-outage");
    assert.equal(alerts[0].actionHref, "/admin/system/cms-health");
  }
});
test("database outage still suppresses dependent unavailable alerts", () => {
  const s = base(); s.cms!.available = false; s.system.databaseConnected = false;
  const alerts = deriveAdminAlertCandidates(s);
  assert.deepEqual(alerts.map(alert => alert.key), ["system.database.unavailable"]);
});
test("system issue source links open the relevant diagnostic section", () => {
  const s = base(); s.system.authConfigured = false; s.system.databaseConnected = false;
  for (const alert of deriveAdminAlertCandidates(s)) assert.equal(alert.actionHref, "/admin/system#service-health-heading");
});
