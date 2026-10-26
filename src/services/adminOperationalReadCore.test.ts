import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    reason: "The search completed without a recorded provider failure but returned no matching results.",
    retryable: false,
    correlation: "legacy_fallback",
    providers: [],
  });

  const failed = {
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
    status: "FAILED",
    createdAt: new Date("2026-10-23T08:00:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
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


test("flight, hotel, and car provider logs carry exact request correlation for future diagnostics", () => {
  const flightRoute = readFileSync("src/app/api/flights/search/route.ts", "utf8");
  const hotelRoute = readFileSync("src/app/api/hotels/search/route.ts", "utf8");
  const carRoute = readFileSync("src/app/api/cars/search/route.ts", "utf8");
  assert.match(flightRoute, /service: "flight-search"[\s\S]*?metadata: \{ requestId \}/);
  assert.match(hotelRoute, /service: "hotel-search"[\s\S]*?metadata: \{ requestId \}/);
  assert.match(carRoute, /service: "car-search"[\s\S]*?metadata: \{ requestId \}/);
});

test("search detail renders diagnostics without adding write actions", () => {
  const page = readFileSync("src/app/admin/searches/[id]/page.tsx", "utf8");
  assert.match(page, /Search outcome/);
  assert.match(page, /Reason code/);
  assert.match(page, /Retryable/);
  assert.match(page, /Provider outcomes/);
  assert.doesNotMatch(page, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});


test("partial searches with zero results do not claim that another provider returned results", () => {
  const row = {
    id: "search_partial_zero",
    requestId: "request_partial_zero",
    userId: null,
    visitorId: null,
    type: "HOTEL",
    origin: null,
    destination: "London",
    checkIn: new Date("2026-11-01T00:00:00.000Z"),
    checkOut: new Date("2026-11-03T00:00:00.000Z"),
    query: {},
    resultCount: 0,
    latencyMs: 1500,
    status: "PARTIAL",
    createdAt: new Date("2026-10-23T09:00:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
  const providers = [
    {
      provider: "KAYAK sandbox",
      status: "FAILED" as const,
      reasonCode: "UPSTREAM_UNAVAILABLE",
      reason: "Upstream unavailable",
      retryable: true,
      latencyMs: 1400,
      observedAt: "2026-10-23T09:00:00.000Z",
    },
  ];
  const diagnostic = __adminOperationalReadCoreTest.exactSearchDiagnostic(row, providers);
  assert.equal(diagnostic.reason.includes("another provider returned results"), false);
  assert.match(diagnostic.reason, /returned no matching results/);
});

test("failed searches with a successful provider do not claim all providers failed", () => {
  const row = {
    id: "search_mixed_failure",
    requestId: "request_mixed_failure",
    userId: null,
    visitorId: null,
    type: "FLIGHT",
    origin: "LOS",
    destination: "LHR",
    checkIn: null,
    checkOut: null,
    query: {},
    resultCount: 0,
    latencyMs: 1300,
    status: "FAILED",
    createdAt: new Date("2026-10-23T09:05:00.000Z"),
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
      latencyMs: 300,
      observedAt: "2026-10-23T09:05:00.000Z",
    },
    {
      provider: "KAYAK sandbox",
      status: "FAILED" as const,
      reasonCode: "PROVIDER_TIMEOUT",
      reason: "Provider timeout",
      retryable: true,
      latencyMs: 1200,
      observedAt: "2026-10-23T09:05:00.000Z",
    },
  ];
  const diagnostic = __adminOperationalReadCoreTest.exactSearchDiagnostic(row, providers);
  assert.equal(diagnostic.reasonCode, "PROVIDER_FAILURE_NO_USABLE_RESULTS");
  assert.equal(diagnostic.reason.includes("All available providers failed"), false);
});

test("disabled unsupported searches preserve the safe unsupported reason", () => {
  const diagnostic = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "KAYAK sandbox",
    status: "DISABLED",
    latencyMs: 5,
    errorMessage: "unsupported_destination",
    createdAt: new Date("2026-10-23T09:10:00.000Z"),
  });
  assert.equal(diagnostic.reasonCode, "UNSUPPORTED_SEARCH");
  assert.equal(diagnostic.reason, "Unsupported search / provider coverage");
  assert.equal(diagnostic.retryable, false);
});


test("structured car provider errors map to safe diagnostic categories", () => {
  const auth = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "KAYAK sandbox",
    status: "FAILED",
    latencyMs: 20,
    errorMessage: "provider_auth_error",
    createdAt: new Date("2026-10-23T09:20:00.000Z"),
  });
  assert.equal(auth.reasonCode, "AUTH_OR_CONFIG");
  assert.equal(auth.reason, "Authentication / configuration");
  assert.equal(auth.retryable, false);

  for (const code of ["provider_network_error", "provider_server_error", "provider_invalid_response"]) {
    const diagnostic = __adminOperationalReadCoreTest.providerDiagnostic({
      provider: "KAYAK sandbox",
      status: "FAILED",
      latencyMs: 30,
      errorMessage: code,
      createdAt: new Date("2026-10-23T09:21:00.000Z"),
    });
    assert.equal(diagnostic.reasonCode, "UPSTREAM_UNAVAILABLE");
    assert.equal(diagnostic.reason, "Upstream unavailable");
    assert.equal(diagnostic.retryable, true);
  }
});


test("disabled car provider diagnostics distinguish invalid pickup time from unsupported coverage", () => {
  const invalid = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "KAYAK sandbox",
    status: "DISABLED",
    latencyMs: 5,
    errorMessage: "pickup_time_past",
    createdAt: new Date("2026-10-23T09:30:00.000Z"),
  });
  assert.equal(invalid.reasonCode, "INVALID_SEARCH");
  assert.equal(invalid.reason, "Invalid search");
  assert.equal(invalid.retryable, false);

  const unsupported = __adminOperationalReadCoreTest.providerDiagnostic({
    provider: "KAYAK sandbox",
    status: "DISABLED",
    latencyMs: 5,
    errorMessage: "unsupported_location",
    createdAt: new Date("2026-10-23T09:31:00.000Z"),
  });
  assert.equal(unsupported.reasonCode, "UNSUPPORTED_SEARCH");
  assert.equal(unsupported.reason, "Unsupported search / provider coverage");
  assert.equal(unsupported.retryable, false);
});


test("single-provider partial car results do not invent another successful provider", () => {
  const row = {
    id: "search_car_partial",
    requestId: "request_car_partial",
    userId: null,
    visitorId: null,
    type: "CAR",
    origin: "LHR",
    destination: "LHR",
    checkIn: null,
    checkOut: null,
    query: {},
    resultCount: 3,
    latencyMs: 1400,
    status: "PARTIAL",
    createdAt: new Date("2026-10-23T09:40:00.000Z"),
    visitor: null,
    journeyEvents: [],
  } as never;
  const providers = [{
    provider: "KAYAK sandbox",
    status: "FAILED" as const,
    reasonCode: "UPSTREAM_UNAVAILABLE",
    reason: "Upstream unavailable",
    retryable: true,
    latencyMs: 1300,
    observedAt: "2026-10-23T09:40:00.000Z",
  }];

  const diagnostic = __adminOperationalReadCoreTest.exactSearchDiagnostic(row, providers);
  assert.equal(diagnostic.outcome, "PARTIAL");
  assert.equal(diagnostic.reasonCode, "PROVIDER_PARTIAL_FAILURE");
  assert.equal(diagnostic.reason, "KAYAK sandbox did not complete successfully, but partial results were returned.");
  assert.equal(diagnostic.reason.includes("another provider"), false);
});

test("provider count is based only on exact execution evidence, deduplicated by provider", () => {
  const { exactProviderSummary } = __adminOperationalReadCoreTest;
  assert.equal(exactProviderSummary([]), null);
  assert.deepEqual(exactProviderSummary([
    { provider: "Duffel", status: "SUCCESS" },
    { provider: "duffel", status: "FAILED" },
    { provider: "KAYAK sandbox", status: "DISABLED" },
  ]), { total: 2, successful: 0, failed: 1, degraded: 0, disabled: 1 });
});

test("provider log mapping rejects other services, environments and request IDs", () => {
  const { correlatedProviderLogs } = __adminOperationalReadCoreTest;
  const timestamp = new Date("2026-10-23T10:00:00.000Z");
  const rows = [{ requestId: "request-A", type: "FLIGHT", createdAt: timestamp }] as never;
  const candidate = (requestId: string, service: string, environment: string, at = timestamp) => ({
    provider: "Duffel", status: "SUCCESS" as const, service,
    metadata: { requestId, environment }, createdAt: at,
  });
  const mapped = correlatedProviderLogs(rows, [
    candidate("request-A", "flight-search", "staging"),
    candidate("request-B", "flight-search", "staging"),
    candidate("request-A", "hotel-search", "staging"),
    candidate("request-A", "flight-search", "production"),
    candidate("request-A", "flight-search", "staging", new Date("2026-10-23T09:00:00.000Z")),
  ], "staging");
  assert.equal(mapped.get("request-A")?.length, 1);
  assert.equal(mapped.get("request-B"), undefined);
});
