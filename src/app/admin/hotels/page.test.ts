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
  assert.match(service, /disabledCalls/);
  assert.match(service, /degradedCalls/);
  assert.match(service, /failedCalls/);
  assert.match(service, /status: \{ in: \["FAILED", "DEGRADED", "DISABLED"\] \}/);
});

test("hotel operations does not invent unavailable telemetry", () => {
  assert.match(hotelsPage, /Hotel telemetry unavailable/);
  assert.match(hotelsPage, /No zero values were invented/);
  assert.match(service, /if \(!db\) return null/);
  assert.match(service, /catch \(error\)[\s\S]*return null/);
});
