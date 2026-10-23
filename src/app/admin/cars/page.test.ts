import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsPage = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const service = readFileSync("src/services/adminCarOperationsService.ts", "utf8");
const route = readFileSync("src/app/api/cars/search/route.ts", "utf8");

test("car admin is an honest operational overview", () => {
  assert.match(carsPage, /title="Car Operations"/);
  assert.match(carsPage, /getCarOperationsSnapshot/);
  assert.match(carsPage, /getProviderIntegrationStatuses/);
  assert.match(carsPage, /Car provider readiness/);
  assert.match(carsPage, /Provider-call telemetry/);
  assert.match(carsPage, /Recent car searches/);
  assert.doesNotMatch(carsPage, /Car Search Readiness/);
  assert.doesNotMatch(carsPage, /Provider not configured/);
  assert.doesNotMatch(carsPage, /Search disabled/);
});

test("car operations snapshot is environment scoped and read-only", () => {
  assert.match(service, /type: "CAR"/);
  assert.match(service, /query: \{ path: \["environment"\], equals: environment \}/);
  assert.match(service, /status: "SUCCESS"/);
  assert.match(service, /status: "FAILED"/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.match(carsPage, /\/admin\/searches\?product=CAR/);
  assert.match(carsPage, /\/admin\/journeys\?product=CAR/);
  assert.doesNotMatch(carsPage, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form/);
});

test("car operations does not invent provider-call telemetry", () => {
  assert.match(carsPage, /does not yet persist per-provider car-search calls in ApiProviderLog/);
  assert.match(carsPage, /will not invent provider call counts, provider failure rates, or provider latency/);
  assert.match(carsPage, /Provider-call telemetry pending/);
  assert.match(carsPage, /Feature-disabled, invalid-request, and unsupported-coverage responses currently return before SearchHistory recording/);
  assert.doesNotMatch(service, /apiProviderLog/);
});

test("car provider readiness comes from the live integration registry", () => {
  assert.match(carsPage, /products\.includes\("CARS"\)/);
  assert.match(carsPage, /integration\.configured/);
  assert.match(carsPage, /integration\.searchEnabled/);
  assert.match(carsPage, /integration\.externalHandoffEnabled/);
  assert.match(carsPage, /integration\.bookingEnabled/);
});

test("car search route records only aggregate search telemetry today", () => {
  assert.match(route, /logSearchHistory/);
  assert.match(route, /type: "CAR"/);
  assert.doesNotMatch(route, /logProviderCall/);
  assert.match(route, /recordSearch\(0, "FAILED"\)/);
  assert.match(route, /recordSearch\(results\.length, "SUCCESS"\)/);
  assert.match(route, /FEATURE_DISABLED/);
  assert.match(route, /Invalid car search parameters/);
  assert.match(route, /if \(unsupported\) return Response\.json/);
});

test("car operations does not invent unavailable telemetry", () => {
  assert.match(carsPage, /Car telemetry unavailable/);
  assert.match(carsPage, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});


test("car provider exceptions classify unsupported coverage separately from failures", () => {
  assert.match(service, /carProviderIssueCategory\(issue\.status, issue\.errorMessage\)/);
  assert.match(service, /if \(status === "DISABLED"\)/);
  assert.match(service, /Unsupported search \/ provider coverage/);
  assert.match(service, /Provider disabled \/ skipped/);
  assert.match(service, /classifyProviderIssue\(message\)\.label/);
});
