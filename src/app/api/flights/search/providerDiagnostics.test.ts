import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderResult, PublicFlightResult } from "@/lib/types";
import { logNativeFlightProviderDiagnostics } from "./providerDiagnostics";

const publicFlight = (id: string, provider: string) => ({ id, provider }) as PublicFlightResult;

test("logs only safe provider diagnostics for native flight searches", (t) => {
  const calls: unknown[][] = [];
  t.mock.method(console, "info", (...args: unknown[]) => { calls.push(args); });
  const providerStatuses: ProviderResult<unknown>[] = [
    { provider: "Duffel", status: "success", results: [{ id: "duffel-1" }], latencyMs: 123 },
    {
      provider: "KAYAK sandbox",
      status: "failed",
      results: [],
      latencyMs: 456,
      error: "must-not-be-logged",
      errorCategory: "auth",
      errorReason: "provider_auth_error",
    },
  ];

  logNativeFlightProviderDiagnostics(Object.assign({
    requestId: "mobile-request-1",
    mobilePlatform: "android",
    kayakClientIpPresent: true,
    userAgentPresent: true,
    providerStatuses,
    finalResults: [publicFlight("duffel-1", "Duffel"), publicFlight("kayak-1", "KAYAK sandbox")],
  }, {
    clientIp: "203.0.113.42",
    userAgent: "Kurioticket Android/0.3.0",
    authorization: "Bearer secret-token",
    cookie: "session=secret-cookie",
    apiKey: "kayak-secret-api-key",
  }));

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "[flight-search:provider-diagnostics]");
  assert.deepEqual(calls[0][1], {
    requestId: "mobile-request-1",
    mobilePlatform: "android",
    kayakClientIpPresent: true,
    userAgentPresent: true,
    providers: [
      { provider: "Duffel", status: "success", resultCount: 1, latencyMs: 123, errorCategory: undefined, errorReason: undefined },
      { provider: "KAYAK sandbox", status: "failed", resultCount: 0, latencyMs: 456, errorCategory: "auth", errorReason: "provider_auth_error" },
    ],
    finalResultCount: 2,
    finalKayakResultCount: 1,
  });

  const serialized = JSON.stringify(calls);
  for (const secret of [
    "203.0.113.42",
    "Kurioticket Android/0.3.0",
    "Bearer secret-token",
    "session=secret-cookie",
    "kayak-secret-api-key",
    "must-not-be-logged",
  ]) assert.doesNotMatch(serialized, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("does not add log noise or mutate responses for non-native searches", (t) => {
  const calls: unknown[][] = [];
  t.mock.method(console, "info", (...args: unknown[]) => { calls.push(args); });
  const finalResults = [publicFlight("duffel-1", "Duffel")];
  const responseBefore = JSON.stringify({ results: finalResults, status: "SUCCESS" });

  logNativeFlightProviderDiagnostics({
    requestId: "web-request-1",
    mobilePlatform: null,
    kayakClientIpPresent: false,
    userAgentPresent: false,
    providerStatuses: [],
    finalResults,
  });

  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify({ results: finalResults, status: "SUCCESS" }), responseBefore);
});
