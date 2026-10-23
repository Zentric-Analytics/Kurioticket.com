import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsPage = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const service = readFileSync("src/services/adminCarOperationsService.ts", "utf8");
const route = readFileSync("src/app/api/cars/search/route.ts", "utf8");

test("car admin is a provider-aware operational overview", () => {
  assert.match(carsPage, /title="Car Operations"/);
  assert.match(carsPage, /Car provider health/);
  assert.match(carsPage, /Search exceptions/);
  assert.match(carsPage, /Locations needing attention/);
  assert.match(carsPage, /Provider exceptions/);
  assert.match(carsPage, /Recent car searches/);
  assert.doesNotMatch(carsPage, /Car Search Readiness/);
  assert.doesNotMatch(carsPage, /Provider-call telemetry pending/);
});

test("car operations snapshot is environment scoped and read-only", () => {
  assert.match(service, /type: "CAR"/);
  assert.match(service, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /service: "car-search"/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.match(carsPage, /\/admin\/searches\?product=CAR/);
  assert.match(carsPage, /\/admin\/journeys\?product=CAR/);
  assert.doesNotMatch(carsPage, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("car provider health separates attempted calls from disabled coverage", () => {
  assert.match(service, /status: \{ in: \["SUCCESS", "DEGRADED", "FAILED"\] \}/);
  assert.match(service, /attemptedCalls/);
  assert.match(service, /disabledCalls/);
  assert.match(service, /failedCalls/);
  assert.match(carsPage, /Calls \(24h\)/);
  assert.match(carsPage, /Disabled \(24h\)/);
  assert.match(carsPage, /Failed \(24h\)/);
});

test("car search route persists exact provider telemetry and unsupported searches", () => {
  assert.match(route, /logProviderCall/);
  assert.match(route, /service: "car-search"/);
  assert.match(route, /metadata: \{ requestId \}/);
  assert.match(route, /errorMessage: provider\.errorReason \|\| provider\.error/);
  assert.match(route, /if \(unsupported\) \{[\s\S]*recordSearch\(0, "FAILED"\)/);
  assert.match(route, /status: provider\.status === "success" \? "SUCCESS" : provider\.status === "skipped" \? "DISABLED" : "FAILED"/);
});

test("car telemetry boundary excludes only requests rejected before a valid search record", () => {
  assert.match(carsPage, /Feature-disabled and invalid-request responses still return before a valid SearchHistory record exists/);
  assert.doesNotMatch(carsPage, /unsupported-coverage responses currently return before SearchHistory recording/);
});

test("car provider exceptions classify unsupported coverage separately from failures", () => {
  assert.match(service, /carProviderIssueCategory\(issue\.status, issue\.errorMessage\)/);
  assert.match(service, /if \(status === "DISABLED"\)/);
  assert.match(service, /Unsupported search \/ provider coverage/);
  assert.match(service, /Provider disabled \/ skipped/);
  assert.match(service, /classifyProviderIssue\(message\)\.label/);
  assert.doesNotMatch(carsPage, /errorMessage/);
});

test("car operations does not invent unavailable telemetry", () => {
  assert.match(carsPage, /Car telemetry unavailable/);
  assert.match(carsPage, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});
