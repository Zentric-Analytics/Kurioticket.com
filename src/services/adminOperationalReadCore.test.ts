import assert from "node:assert/strict";
import test from "node:test";
import { createAdminOperationalReadService, __adminOperationalReadCoreTest } from "./adminOperationalReadCore";

test("authorization happens before query validation or storage", async () => {
  let databaseTouched = false;
  const service = createAdminOperationalReadService({
    authorize: async () => false,
    database: () => { databaseTouched = true; return null; },
    environment: () => "staging",
  });
  const result = await service.searches.list(new URLSearchParams("unknown=1"));
  assert.equal(result.status, "forbidden");
  assert.equal(databaseTouched, false);
});

test("safe provider helpers remove URL details and unsafe source paths", () => {
  assert.equal(__adminOperationalReadCoreTest.safeDomain("https://provider.example/deal?secret=1#x"), "provider.example");
  assert.equal(__adminOperationalReadCoreTest.safeDomain("javascript:alert(1)"), null);
  assert.equal(__adminOperationalReadCoreTest.safePath("/hotels/results?token=abc"), "/hotels/results");
  assert.equal(__adminOperationalReadCoreTest.safePath("https://staging.kurioticket.com/hotels/results?token=abc"), null);
});

test("support source context only returns allowlisted bounded text", () => {
  const source = __adminOperationalReadCoreTest.safeSource({
    page: "mobile_support",
    platform: "ios",
    secret: "do-not-return",
    action: "ticket",
  } as never);
  assert.deepEqual(source, { page: "mobile_support", platform: "ios", action: "ticket" });
});

test("withdrawn or disabled visitors are not exposed as attributed identities", () => {
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "GRANTED", trackingDisabledAt: null }),
    "visitor_123",
  );
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "WITHDRAWN", trackingDisabledAt: new Date() }),
    null,
  );
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "GRANTED", trackingDisabledAt: new Date() }),
    null,
  );
});

test("identity classification distinguishes registered, guest and unattributed records", () => {
  assert.equal(__adminOperationalReadCoreTest.identity("user_123", "visitor_123").kind, "registered");
  assert.equal(__adminOperationalReadCoreTest.identity(null, "visitor_123").kind, "guest");
  assert.equal(__adminOperationalReadCoreTest.identity(null, null).kind, "unattributed");
});

test("registered customer drilldowns include only their direct and exclusively linked consented guest records", () => {
  const { identityWhere } = __adminOperationalReadCoreTest;
  assert.deepEqual(identityWhere({ identity: "registered", userId: "user_123", visitorId: null }), {
    OR: [
      { userId: "user_123" },
      { userId: null, visitor: { is: {
        currentUserId: "user_123",
        consentStatus: "GRANTED",
        trackingDisabledAt: null,
        identityLinks: {
          some: { userId: "user_123" },
          none: { userId: { not: "user_123" } },
        },
      } } },
    ],
  });
  // A general registered-identity filter still shows only directly registered records.
  assert.deepEqual(identityWhere({ identity: "registered", userId: null, visitorId: null }),
    { userId: { not: null } });
  // Explicit visitor filters continue to require consent and that precise visitor.
  assert.deepEqual(identityWhere({ identity: "registered", userId: "user_123", visitorId: "visitor_123" }), {
    userId: "user_123",
    visitorId: "visitor_123",
    visitor: { is: { consentStatus: "GRANTED", trackingDisabledAt: null } },
  });
  assert.deepEqual(identityWhere({ identity: "guest", userId: null, visitorId: "visitor_123" }), {
    userId: null, visitorId: "visitor_123",
    visitor: { is: { consentStatus: "GRANTED", trackingDisabledAt: null } },
  });
});


test("search diagnostics keep zero results distinct from failure and never guess legacy provider causes", () => {
  const base = {
    id: "search_123",
    requestId: "request_123",
    userId: null,
    visitorId: null,
    type: "FLIGHT",
    origin: "LOS",
    destination: "LHR",
    checkIn: null,
    checkOut: null,
    query: {},
    resultCount: 0,
    latencyMs: 1200,
    status: "SUCCESS",
    createdAt: new Date("2026-10-23T08:00:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
  assert.deepEqual(__adminOperationalReadCoreTest.fallbackSearchDiagnostic(base), {
    outcome: "ZERO_RESULTS",
    reasonCode: "NO_MATCHING_RESULTS",
    reason: "Providers responded successfully but returned no matching results.",
    retryable: false,
    correlation: "legacy_fallback",
    providers: [],
  });

  const failed = { ...base, status: "FAILED", resultCount: 0 } as never;
  const diagnostic = __adminOperationalReadCoreTest.fallbackSearchDiagnostic(failed);
  assert.equal(diagnostic.reasonCode, "FAILURE_REASON_UNAVAILABLE");
  assert.equal(diagnostic.correlation, "legacy_fallback");
  assert.equal(diagnostic.retryable, null);
});

test("provider diagnostics expose safe reason categories instead of raw provider errors", () => {
  const timeout = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "Duffel",
    status: "FAILED",
    latencyMs: 12001,
    errorMessage: "provider_timeout secret=https://example.test/token",
    createdAt: new Date("2026-10-23T08:00:00.000Z"),
  });
  assert.equal(timeout.reasonCode, "PROVIDER_TIMEOUT");
  assert.equal(timeout.reason, "Provider timeout");
  assert.equal(timeout.retryable, true);
  assert.equal(JSON.stringify(timeout).includes("example.test"), false);

  const auth = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "KAYAK sandbox",
    status: "FAILED",
    latencyMs: 10,
    errorMessage: "401 invalid api key=secret",
    createdAt: new Date("2026-10-23T08:00:00.000Z"),
  });
  assert.equal(auth.reasonCode, "AUTH_OR_CONFIG");
  assert.equal(auth.retryable, false);
});

test("exact search diagnostics explain partial provider failure without exposing raw error text", () => {
  const row = {
    id: "search_123",
    requestId: "request_123",
    userId: null,
    visitorId: null,
    type: "FLIGHT",
    origin: "LOS",
    destination: "LHR",
    checkIn: null,
    checkOut: null,
    query: {},
    resultCount: 4,
    latencyMs: 1200,
    status: "PARTIAL",
    createdAt: new Date("2026-10-23T08:00:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
  const providers = [
    {
      provider: "Duffel",
      status: "FAILED" as const,
      reasonCode: "PROVIDER_TIMEOUT",
      reason: "Provider timeout",
      retryable: true,
      latencyMs: 12000,
      observedAt: "2026-10-23T08:00:00.000Z",
    },
    {
      provider: "KAYAK sandbox",
      status: "SUCCESS" as const,
      reasonCode: null,
      reason: "Provider completed successfully.",
      retryable: false,
      latencyMs: 400,
      observedAt: "2026-10-23T08:00:00.000Z",
    },
  ];
  const diagnostic = __adminOperationalReadCoreTest.exactSearchDiagnostic(row, providers);
  assert.equal(diagnostic.outcome, "PARTIAL");
  assert.equal(diagnostic.reasonCode, "PROVIDER_PARTIAL_FAILURE");
  assert.equal(diagnostic.retryable, true);
  assert.equal(diagnostic.correlation, "exact");
});


test("exact failed searches distinguish provider failure from internal processing failure", () => {
  const row = {
    id: "search_456",
    requestId: "request_456",
    userId: null,
    visitorId: null,
    type: "FLIGHT",
    origin: "LOS",
    destination: "JFK",
    checkIn: null,
    checkOut: null,
    query: {},
    resultCount: 0,
    latencyMs: 900,
    status: "FAILED",
    createdAt: new Date("2026-10-23T08:30:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
  const providers = [
    {
      provider: "Duffel",
      status: "SUCCESS" as const,
      reasonCode: null,
      reason: "Provider completed successfully.",
      retryable: false,
      latencyMs: 500,
      observedAt: "2026-10-23T08:30:00.000Z",
    },
  ];
  const diagnostic = __adminOperationalReadCoreTest.exactSearchDiagnostic(row, providers);
  assert.equal(diagnostic.reasonCode, "SEARCH_PROCESSING_FAILURE");
  assert.equal(diagnostic.reason, "Providers responded, but the search could not complete during internal result processing.");
  assert.equal(diagnostic.retryable, true);
});
