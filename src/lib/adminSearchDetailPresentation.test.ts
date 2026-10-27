import assert from "node:assert/strict";
import test from "node:test";
import { searchDetailDuration, searchDetailHeadline, searchDetailIdentityLabel, searchDetailOutcomeLabel, searchDetailDiagnosisSummary, searchDetailNextChecks } from "./adminSearchDetailPresentation";

test("search detail titles reflect product and available locations", () => {
  assert.equal(searchDetailHeadline({ product: "FLIGHT", origin: "LOS", destination: "LHR" }), "LOS → LHR");
  assert.equal(searchDetailHeadline({ product: "HOTEL", origin: null, destination: "London" }), "Hotels in London");
  assert.equal(searchDetailHeadline({ product: "CAR", origin: "Ibadan", destination: null }), "Cars in Ibadan");
  assert.equal(searchDetailHeadline({ product: "PACKAGE", origin: null, destination: null }), "Package search");
});

test("search outcomes, duration and identity are displayed without changing underlying records", () => {
  assert.equal(searchDetailOutcomeLabel("ZERO_RESULTS"), "No results");
  assert.equal(searchDetailOutcomeLabel("SUCCESS"), "Complete");
  assert.equal(searchDetailDuration(2450), "2.5s");
  assert.equal(searchDetailDuration(null), "—");
  assert.equal(searchDetailIdentityLabel("unattributed"), "Unattributed");
});

test("diagnosis does not repeat an exact provider reason", () => {
  const providers = [{ provider: "KAYAK sandbox", status: "FAILED" as const, reason: "Authentication / configuration", reasonCode: "AUTH_OR_CONFIG" }];
  assert.equal(searchDetailDiagnosisSummary({ reason: "Authentication / configuration", providers: providers.map(p => ({ ...p, retryable: false, latencyMs: null, observedAt: "2026-10-27T00:00:00Z" })) }), null);
  assert.equal(searchDetailDiagnosisSummary({ reason: "No available provider completed the search successfully.", providers: providers.map(p => ({ ...p, retryable: false, latencyMs: null, observedAt: "2026-10-27T00:00:00Z" })) }), "No available provider completed the search successfully.");
  assert.deepEqual(searchDetailNextChecks([providers[0], providers[0]]), [{ provider: "KAYAK sandbox", guidance: "Check the provider integration's authentication and configuration." }]);
});
