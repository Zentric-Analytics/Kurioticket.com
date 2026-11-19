import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsPage = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const service = readFileSync("src/services/adminCarOperationsService.ts", "utf8");
const route = readFileSync("src/app/api/cars/search/route.ts", "utf8");
const recordsPanel = readFileSync("src/components/admin/ProductSearchRecordsPanel.tsx", "utf8");

test("car admin is a provider-aware operational overview", () => {
  assert.match(carsPage, /title="Car Operations"/);
  assert.match(carsPage, /Car provider health/);
  assert.match(recordsPanel, /Search exceptions and records/);
  assert.match(carsPage, /Locations needing attention/);
  assert.doesNotMatch(carsPage, /Provider exceptions/);
  assert.doesNotMatch(carsPage, /Recent car searches|operations\.recentSearches/);
  assert.match(carsPage, /<ProductSearchRecordsPanel product="CAR"/);
  assert.match(carsPage, /<OperationsMetric/);
  assert.doesNotMatch(carsPage, /Car Search Readiness/);
  assert.doesNotMatch(carsPage, /Provider-call telemetry pending/);
});

test("cars operations share Homepage Fares one-row metrics and balanced overview sections", () => {
  assert.match(carsPage, /<OperationsMetricStrip>/);
  assert.equal((carsPage.match(/<OperationsMetric /g) || []).length, 5);
  assert.doesNotMatch(carsPage, /sm:grid-cols-3 xl:grid-cols-5|grid-cols-2 border-b border-\[#D8E1EC\]/);
  assert.match(carsPage, /integrations\.length > 1|carIntegrations\.length > 1/);
  assert.match(carsPage, /lg:grid-cols-4/);
  assert.doesNotMatch(carsPage, /grid gap-4 xl:grid-cols-2/);
  assert.doesNotMatch(carsPage, /<OperationsProviderIssues|href="\/admin\/providers\?product=cars"/);
});

test("car operations snapshot is environment scoped and read-only", () => {
  assert.match(service, /type: "CAR"/);
  assert.match(service, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /service: "car-search"/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.doesNotMatch(carsPage, /ProductSearchJumpLink|View car searches/);
  assert.doesNotMatch(carsPage, /\/admin\/journeys|\/admin\/searches\//);
  assert.doesNotMatch(carsPage, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("car provider health separates attempted calls from disabled coverage", () => {
  assert.match(service, /status: \{ in: \["SUCCESS", "DEGRADED", "FAILED"\] \}/);
  assert.match(service, /attemptedCalls/);
  assert.match(service, /disabledCalls/);
  assert.match(service, /failedCalls/);
  assert.match(carsPage, /Calls \(Today\)/);
  assert.match(carsPage, /Disabled \(Today\)/);
  assert.match(carsPage, /Failed \(Today\)/);
});

test("car search route persists exact provider telemetry and unsupported searches", () => {
  assert.match(route, /logProviderCall/);
  assert.match(route, /service: "car-search"/);
  assert.match(route, /metadata: \{ \.\.\.application, requestId \}/);
  assert.match(route, /errorMessage: provider\.errorReason \|\| provider\.error/);
  assert.match(route, /if \(unsupported\) \{[\s\S]*recordSearch\(0, "FAILED"\)/);
  assert.match(route, /status: provider\.status === "success" \? "SUCCESS" : provider\.status === "skipped" \? "DISABLED" : "FAILED"/);
});

test("car telemetry boundary excludes only requests rejected before a valid search record", () => {
  assert.match(carsPage, /invalid or feature-disabled requests are excluded/);
  assert.match(carsPage, /Only valid car searches produce recorded search and provider telemetry/);
  assert.doesNotMatch(carsPage, /Telemetry boundaries|Operational boundaries/);
  assert.doesNotMatch(carsPage, /unsupported-coverage responses currently return before SearchHistory recording/);
});

test("car provider exceptions classify unsupported coverage separately from failures", () => {
  assert.match(service, /carProviderIssueCategory\(issue\.status, issue\.errorMessage\)/);
  assert.match(service, /status === "DISABLED" && !message/);
  assert.match(service, /issue\.code === "PROVIDER_ERROR"/);
  assert.match(service, /Provider disabled \/ skipped/);
  assert.match(service, /classifyProviderIssue\(message\)/);
  assert.doesNotMatch(carsPage, /errorMessage/);
});

test("car operations does not invent unavailable telemetry", () => {
  assert.match(carsPage, /Car telemetry unavailable/);
  assert.match(carsPage, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});


test("car provider exception classifier keeps invalid pickup time distinct from coverage", () => {
  assert.match(service, /return status === "DISABLED" && issue\.code === "PROVIDER_ERROR" \? "Provider disabled \/ skipped" : issue\.label/);
  const diagnostics = readFileSync("src/services/searchFailureDiagnostics.ts", "utf8");
  assert.match(diagnostics, /pickup_time_past/);
  assert.match(diagnostics, /code: "INVALID_SEARCH", label: "Invalid search"/);
});


test("car exceptions keep failed, partial, and valid zero-result outcomes distinct", () => {
  assert.match(service, /status: \{ in: \["FAILED", "PARTIAL"\] \}/);
  assert.match(service, /status: "SUCCESS", resultCount: 0/);
  assert.match(service, /search\.status === "FAILED" \? "FAILED" : search\.status === "PARTIAL" \? "PARTIAL" : "ZERO_RESULTS"/);
  assert.match(carsPage, /Partial \/ failed/);
  assert.match(carsPage, /Zero results/);
  assert.match(recordsPanel, /value === "ZERO_RESULTS"/);
});
