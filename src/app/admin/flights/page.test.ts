import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flightsPage = readFileSync("src/app/admin/flights/page.tsx", "utf8");
const service = readFileSync("src/services/adminFlightOperationsService.ts", "utf8");

test("flight admin is an operational overview rather than a readiness-only page", () => {
  assert.match(flightsPage, /title="Flight Operations"/);
  assert.match(flightsPage, /getFlightOperationsSnapshot/);
  assert.match(flightsPage, /getProviderIntegrationStatuses/);
  assert.match(flightsPage, /Recent flight searches/);
  assert.match(flightsPage, /View flight searches/);
  assert.match(flightsPage, /View flight journeys/);
  assert.match(flightsPage, /search\.latencyMs === null \? "—"/);
  assert.doesNotMatch(flightsPage, /Flight Search Readiness/);
});

test("flight operations keeps booking and live status claims outside search telemetry", () => {
  assert.match(flightsPage, /A provider handoff is not a booking confirmation/);
  assert.match(flightsPage, /search data is not used to infer live flight status/);
  assert.match(flightsPage, /Booking provider-owned/);
  assert.match(flightsPage, /Flight status separate/);
});

test("flight operations snapshot is environment-scoped and real-data only", () => {
  assert.match(service, /type: "FLIGHT"/);
  assert.match(service, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /status: "SUCCESS"/);
  assert.match(service, /status: "PARTIAL"/);
  assert.match(service, /status: "FAILED"/);
  assert.match(service, /resultCount: 0/);
  assert.match(service, /_avg: \{ latencyMs: true \}/);
  assert.match(service, /take: 10/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.match(service, /return null/);
});

test("flight operations exposes focused search and provider exception diagnostics", () => {
  assert.match(flightsPage, /Search exceptions/);
  assert.match(flightsPage, /Routes needing attention/);
  assert.match(flightsPage, /Provider exceptions/);
  assert.match(flightsPage, /Failed searches/);
  assert.match(flightsPage, /Partial searches/);
  assert.match(flightsPage, /Raw provider error payloads are not exposed/);
  assert.match(service, /exceptionSearches/);
  assert.match(service, /routeIssues/);
  assert.match(service, /providerIssues/);
  assert.match(service, /service: "flight-search"/);
  assert.match(service, /status: \{ in: \["FAILED", "DEGRADED"\] \}/);
});

test("provider diagnostics classify errors without returning raw provider messages", () => {
  assert.match(service, /classifyProviderIssue\(issue\.errorMessage\)\.label/);
  assert.doesNotMatch(flightsPage, /errorMessage/);
});

test("zero-result success is treated as an operational exception, not a failed search", () => {
  assert.match(service, /status: "SUCCESS", resultCount: 0/);
  assert.match(service, /search\.status === "FAILED" \? "FAILED" : search\.status === "PARTIAL" \? "PARTIAL" : "ZERO_RESULTS"/);
  assert.match(flightsPage, /ZERO_RESULTS/);
});
