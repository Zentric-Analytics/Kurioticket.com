import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelsPage = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const service = readFileSync("src/services/adminHotelOperationsService.ts", "utf8");
const recordsPanel = readFileSync("src/components/admin/ProductSearchRecordsPanel.tsx", "utf8");

test("hotel admin is an operational overview rather than a readiness-only page", () => {
  assert.match(hotelsPage, /title="Hotel Operations"/);
  assert.match(hotelsPage, /getHotelOperationsSnapshot/);
  assert.match(hotelsPage, /getProviderIntegrationStatuses/);
  assert.doesNotMatch(hotelsPage, /Recent hotel searches|operations\.recentSearches/);
  assert.match(hotelsPage, /<ProductSearchRecordsPanel product="HOTEL"/);
  assert.match(hotelsPage, /<OperationsMetric/);
  assert.match(hotelsPage, /<ProductSearchJumpLink product="HOTEL"/);
  assert.doesNotMatch(hotelsPage, /View hotel journeys|\/admin\/journeys/);
  assert.doesNotMatch(hotelsPage, /Hotel Search Readiness/);
  assert.doesNotMatch(hotelsPage, /Kurioticket static catalogue/);
});

test("hotels operations share Homepage Fares one-row metrics and balanced overview sections", () => {
  assert.match(hotelsPage, /<OperationsMetricStrip>/);
  assert.equal((hotelsPage.match(/<OperationsMetric /g) || []).length, 5);
  assert.doesNotMatch(hotelsPage, /sm:grid-cols-3 xl:grid-cols-5|grid-cols-2 border-b border-\[#D8E1EC\]/);
  assert.match(hotelsPage, /integrations\.length > 1|hotelIntegrations\.length > 1/);
  assert.match(hotelsPage, /lg:grid-cols-4/);
  assert.doesNotMatch(hotelsPage, /grid gap-4 xl:grid-cols-2/);
  assert.match(hotelsPage, /<OperationsProviderIssues/);
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

test("hotel operations keeps search diagnostics within Providers", () => {
  assert.match(hotelsPage, /<ProductSearchJumpLink product="HOTEL"/);
  assert.doesNotMatch(hotelsPage, /\/admin\/searches\//);
  assert.match(hotelsPage, /booking completion remains provider-owned/);
  assert.match(hotelsPage, /provider handoffs do not confirm reservations/);
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
  assert.match(recordsPanel, /Search exceptions and records/);
  assert.match(hotelsPage, /Destinations needing attention/);
  assert.match(hotelsPage, /Provider exceptions/);
  assert.match(recordsPanel, /value: "FAILED"/);
  assert.match(recordsPanel, /value: "PARTIAL"/);
  assert.match(hotelsPage, /Raw provider error payloads are not exposed/);
  assert.match(service, /exceptionSearches/);
  assert.match(service, /destinationIssues/);
  assert.match(service, /providerIssues/);
  assert.match(service, /status: \{ in: \["FAILED", "DEGRADED", "DISABLED"\] \}/);
});

test("hotel exception diagnostics keep valid zero results distinct from failure", () => {
  assert.match(service, /status: "SUCCESS", resultCount: 0/);
  assert.match(service, /search\.status === "FAILED" \? "FAILED" : search\.status === "PARTIAL" \? "PARTIAL" : "ZERO_RESULTS"/);
  assert.match(recordsPanel, /value === "ZERO_RESULTS"/);
});

test("hotel provider exceptions classify disabled coverage without exposing raw errors", () => {
  assert.match(service, /hotelProviderIssueCategory\(issue\.status, issue\.errorMessage\)/);
  assert.match(service, /if \(status === "DISABLED"\)/);
  assert.match(service, /Unsupported search \/ provider coverage/);
  assert.match(service, /Provider disabled \/ skipped/);
  assert.match(service, /classifyProviderIssue\(message\)\.label/);
  assert.doesNotMatch(hotelsPage, /errorMessage/);
});
