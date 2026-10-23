import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelsPage = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const service = readFileSync("src/services/adminHotelOperationsService.ts", "utf8");

test("hotel admin is an operational overview rather than a readiness-only page", () => {
  assert.match(hotelsPage, /title="Hotel Operations"/);
  assert.match(hotelsPage, /getHotelOperationsSnapshot/);
  assert.match(hotelsPage, /getProviderIntegrationStatuses/);
  assert.match(hotelsPage, /Recent hotel searches/);
  assert.match(hotelsPage, /View hotel searches/);
  assert.match(hotelsPage, /View hotel journeys/);
  assert.doesNotMatch(hotelsPage, /Hotel Search Readiness/);
  assert.doesNotMatch(hotelsPage, /Kurioticket static catalogue/);
});

test("hotel operations snapshot is environment and service scoped", () => {
  assert.match(service, /type: "HOTEL"/);
  assert.match(service, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /service: "hotel-search"/);
  assert.match(service, /metadata: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /status: "SUCCESS"/);
  assert.match(service, /status: "PARTIAL"/);
  assert.match(service, /status: "FAILED"/);
  assert.match(service, /status: "DISABLED"/);
  assert.match(service, /resultCount: 0/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
});

test("hotel operations remains read-only and links to canonical search diagnostics", () => {
  assert.match(hotelsPage, /\/admin\/searches\?product=HOTEL/);
  assert.match(hotelsPage, /\/admin\/searches\//);
  assert.match(hotelsPage, /Provider-owned reservation/);
  assert.match(hotelsPage, /provider handoff is not a Kurioticket reservation confirmation/);
  assert.doesNotMatch(hotelsPage, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("hotel provider health distinguishes disabled coverage from provider failure", () => {
  assert.match(hotelsPage, /Disabled \(24h\)/);
  assert.match(hotelsPage, /Degraded \(24h\)/);
  assert.match(hotelsPage, /Failed \(24h\)/);
  assert.match(service, /attemptedCalls/);
  assert.match(service, /disabledCalls/);
  assert.match(service, /degradedCalls/);
  assert.match(service, /failedCalls/);
  assert.match(service, /status: \{ in: \["SUCCESS", "DEGRADED", "FAILED"\] \}/);
  assert.match(service, /status: \{ in: \["FAILED", "DEGRADED", "DISABLED"\] \}/);
});

test("hotel operations does not invent unavailable telemetry", () => {
  assert.match(hotelsPage, /Hotel telemetry unavailable/);
  assert.match(hotelsPage, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});


test("hotel operations exposes focused search, destination, and provider exceptions", () => {
  assert.match(hotelsPage, /Search exceptions/);
  assert.match(hotelsPage, /Destinations needing attention/);
  assert.match(hotelsPage, /Provider exceptions/);
  assert.match(hotelsPage, /Failed searches/);
  assert.match(hotelsPage, /Partial searches/);
  assert.match(hotelsPage, /Raw provider error payloads are not exposed/);
  assert.match(service, /exceptionSearches/);
  assert.match(service, /destinationIssues/);
  assert.match(service, /providerIssues/);
  assert.match(service, /status: \{ in: \["FAILED", "DEGRADED", "DISABLED"\] \}/);
});

test("hotel exception diagnostics keep valid zero results distinct from failure", () => {
  assert.match(service, /status: "SUCCESS", resultCount: 0/);
  assert.match(service, /search\.status === "FAILED" \? "FAILED" : search\.status === "PARTIAL" \? "PARTIAL" : "ZERO_RESULTS"/);
  assert.match(hotelsPage, /search\.kind\.replaceAll\("_", " "\)/);
});

test("hotel provider exceptions classify disabled coverage without exposing raw errors", () => {
  assert.match(service, /hotelProviderIssueCategory\(issue\.status, issue\.errorMessage\)/);
  assert.match(service, /if \(status === "DISABLED"\)/);
  assert.match(service, /Unsupported search \/ provider coverage/);
  assert.match(service, /Provider disabled \/ skipped/);
  assert.match(service, /classifyProviderIssue\(message\)\.label/);
  assert.doesNotMatch(hotelsPage, /errorMessage/);
});
