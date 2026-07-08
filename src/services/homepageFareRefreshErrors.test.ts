import assert from "node:assert/strict";
import test from "node:test";

import { buildSafeHomepageFareRefreshErrorResponse } from "@/services/homepageFareSnapshotService";
import { skippedProvider } from "@/services/travel/providerUtils";

test("homepage fare refresh service exceptions are converted to safe JSON payloads", () => {
  const payload = buildSafeHomepageFareRefreshErrorResponse(new Error("secret provider body api_key=abc stack trace"));

  assert.equal(payload.error, "Homepage fare refresh failed.");
  assert.equal(payload.errorCode, "homepage_fare_refresh_failed");
  assert.match(payload.safeReason, /refresh service failed/i);
  assert.doesNotMatch(payload.safeReason, /api_key|abc|stack trace/i);
});

test("skipped provider results carry structured failure metadata", () => {
  const result = skippedProvider("Duffel", "Missing DUFFEL_API_KEY.");

  assert.equal(result.status, "skipped");
  assert.equal(result.errorReason, "provider_skipped");
  assert.equal(result.errorCategory, "skipped");
});
